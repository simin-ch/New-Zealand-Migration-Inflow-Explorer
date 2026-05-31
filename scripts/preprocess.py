"""
Data preprocessing script for NZ Migration Inflow Explorer.
Reads migration_data.xlsx and outputs public/data/migration.json.

Usage:
    python3 scripts/preprocess.py
"""

import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

# ---------------------------------------------------------------------------
# Jenks Natural Breaks (pure Python, no scipy needed)
# ---------------------------------------------------------------------------

def jenks_breaks(data: list[float], n_classes: int) -> list[float]:
    """
    Compute Jenks Natural Breaks (Fisher's optimal classification).
    Returns a list of n_classes+1 boundary values: [min, break1, ..., max].
    Uses numpy for performance.
    """
    import numpy as np

    arr = np.sort(np.array(data, dtype=float))
    n = len(arr)
    if n == 0:
        return []
    if n <= n_classes:
        return [float(arr[0])] + [float(v) for v in arr] + [float(arr[-1])]

    # Variance matrix: var_sums[i,j] = within-class variance for arr[i..j]
    # We use cumulative sums for O(n²) speed instead of O(n³)
    k = n_classes

    # lower_class_limits[i][c] = start index of class c ending at element i (1-indexed)
    lcl  = np.zeros((n + 1, k + 1), dtype=np.int32)
    var_matrix = np.full((n + 1, k + 1), np.inf)

    # Base case: single class containing first i elements
    variance = np.zeros(n + 1)
    for i in range(1, n + 1):
        val = arr[i - 1]
        if i == 1:
            variance[i] = 0.0
            s1, s2 = val, val * val
        else:
            s1 += val
            s2 += val * val
            variance[i] = s2 - s1 * s1 / i
        var_matrix[i][1] = variance[i]
        lcl[i][1] = 1

    # Fill in for 2..k classes
    for c in range(2, k + 1):
        for i in range(c, n + 1):
            best_var = np.inf
            best_l = c
            # Try each possible start of the last class
            s1 = s2 = 0.0
            w = 0
            for l in range(i, c - 1, -1):
                w += 1
                v = arr[l - 1]
                s2 += v * v
                s1 += v
                within_var = s2 - s1 * s1 / w
                prev = var_matrix[l - 1][c - 1] if l > 1 else 0.0
                total = within_var + prev
                if total < best_var:
                    best_var = total
                    best_l = l
            var_matrix[i][c] = best_var
            lcl[i][c] = best_l

    # Backtrack to find boundaries
    boundaries: list[float] = [float(arr[-1])]
    idx = n
    for c in range(k, 1, -1):
        start = lcl[idx][c]
        boundaries.append(float(arr[start - 1]))
        idx = start - 1
    boundaries.append(float(arr[0]))
    boundaries.reverse()
    return boundaries


# ---------------------------------------------------------------------------
# Column letter → 0-based index  (e.g. "A"→0, "B"→1, "P"→15)
# ---------------------------------------------------------------------------

def col_letter_to_index(ref: str) -> int:
    letters = re.sub(r'\d', '', ref).upper()
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - ord('A') + 1)
    return idx - 1


# ---------------------------------------------------------------------------
# Read xlsx without openpyxl
# ---------------------------------------------------------------------------

NS = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}


def get_si_text(si_elem) -> str:
    """Extract plain text from a sharedStrings <si> element (handles rich text <r><t>)."""
    parts = []
    # Simple <t> child
    t = si_elem.find('ns:t', NS)
    if t is not None and t.text:
        return t.text
    # Rich text: multiple <r><t>
    for r_elem in si_elem.findall('ns:r', NS):
        t2 = r_elem.find('ns:t', NS)
        if t2 is not None and t2.text:
            parts.append(t2.text)
    return ''.join(parts)


def read_xlsx(path: str) -> list[dict]:
    with zipfile.ZipFile(path) as z:
        with z.open('xl/sharedStrings.xml') as f:
            ss_tree = ET.parse(f)
        strings = [get_si_text(si) for si in ss_tree.findall('.//ns:si', NS)]

        with z.open('xl/worksheets/sheet1.xml') as f:
            sheet_tree = ET.parse(f)

    sheet_rows = sheet_tree.findall('.//ns:row', NS)

    def cell_val(c):
        t  = c.get('t', '')
        r  = c.get('r', '')          # e.g. "A1", "B3"
        col_idx = col_letter_to_index(r) if r else None
        v  = c.find('ns:v', NS)
        if v is None or v.text is None:
            return col_idx, None
        if t == 's':
            return col_idx, strings[int(v.text)]
        return col_idx, v.text

    # Parse header row using column references to avoid misalignment
    header_row = sheet_rows[0]
    headers: dict[int, str] = {}
    for c in header_row.findall('ns:c', NS):
        idx, val = cell_val(c)
        if idx is not None and val is not None:
            headers[idx] = str(val)

    records = []
    for row in sheet_rows[1:]:
        row_dict: dict[str, str | None] = {h: None for h in headers.values()}
        for c in row.findall('ns:c', NS):
            idx, val = cell_val(c)
            if idx is not None and idx in headers:
                row_dict[headers[idx]] = val
        records.append(row_dict)

    return records


# ---------------------------------------------------------------------------
# Continent centre-points (hardcoded)
# ---------------------------------------------------------------------------

CONTINENT_CENTERS: dict[str, tuple[float, float]] = {
    'Asia':     (34.0,  100.0),
    'Europe':   (50.0,   15.0),
    'Oceania':  (-20.0, 150.0),
    'Americas': (10.0,  -80.0),
    'Africa':   (5.0,    20.0),
}

VALID_CONTINENTS = set(CONTINENT_CENTERS.keys())


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    base = Path(__file__).parent.parent
    src  = base / 'migration_data.xlsx'
    dst  = base / 'public' / 'data' / 'migration.json'
    dst.parent.mkdir(parents=True, exist_ok=True)

    print('Reading xlsx…')
    raw = read_xlsx(str(src))
    print(f'Total rows read: {len(raw)}')
    if raw:
        print(f'Sample row: {raw[0]}')

    raw = [r for r in raw if r.get('Continent') in VALID_CONTINENTS]
    print(f'Rows after filtering UNS: {len(raw)}')

    country_meta: dict[str, dict] = {}
    # bucket[year][code][sex] = numeric fields dict
    bucket: dict[str, dict[str, dict[str, dict]]] = defaultdict(lambda: defaultdict(dict))

    def to_int(v) -> int:
        try:
            return int(float(v)) if v else 0
        except (ValueError, TypeError):
            return 0

    for r in raw:
        year = r.get('Year')
        code = r.get('Country_Code')
        sex  = r.get('Sex')
        if not year or not code or not sex:
            continue

        if code not in country_meta:
            country_meta[code] = {
                'name':      r.get('Country_Name', ''),
                'continent': r.get('Continent', ''),
                'lat':       float(r.get('Latitude')  or 0),
                'lon':       float(r.get('Longitude') or 0),
            }

        bucket[year][code][sex] = {
            'total':    to_int(r.get('Total_Inflow')),
            'student':  to_int(r.get('Visa_Student')),
            'work':     to_int(r.get('Visa_Work')),
            'resident': to_int(r.get('Visa_Resident')),
            'other':    to_int(r.get('Visa_Other')),
            'under18':  to_int(r.get('Age_Under_18')),
            'age18_30': to_int(r.get('Age_18_30')),
            'age31_50': to_int(r.get('Age_31_50')),
            'above50':  to_int(r.get('Age_Above_50')),
        }

    years_available = sorted(bucket.keys(), key=int)
    print(f'Years found: {years_available}')
    print(f'Countries found: {len(country_meta)}')

    # ---- Build per-country, per-year ----------------------------------------
    all_inflows_for_jenks: list[float] = []
    country_year_map: dict[str, dict[str, dict]] = defaultdict(dict)

    for year, codes in bucket.items():
        for code, sex_dict in codes.items():
            male      = sex_dict.get('Male',      {})
            female    = sex_dict.get('Female',    {})
            no_record = sex_dict.get('No Record', {})

            def g(d, k): return d.get(k, 0)

            total = g(male, 'total') + g(female, 'total') + g(no_record, 'total')
            if total > 0:
                all_inflows_for_jenks.append(float(total))

            country_year_map[code][year] = {
                'totalInflow': total,
                'sex': {
                    'male':     g(male,      'total'),
                    'female':   g(female,    'total'),
                    'noRecord': g(no_record, 'total'),
                },
                'visa': {
                    'student':  g(male,'student')  + g(female,'student')  + g(no_record,'student'),
                    'work':     g(male,'work')     + g(female,'work')     + g(no_record,'work'),
                    'resident': g(male,'resident') + g(female,'resident') + g(no_record,'resident'),
                    'other':    g(male,'other')    + g(female,'other')    + g(no_record,'other'),
                },
                'age': {
                    'male': {
                        'under18':  g(male, 'under18'),
                        'age18_30': g(male, 'age18_30'),
                        'age31_50': g(male, 'age31_50'),
                        'above50':  g(male, 'above50'),
                    } if male else None,
                    'female': {
                        'under18':  g(female, 'under18'),
                        'age18_30': g(female, 'age18_30'),
                        'age31_50': g(female, 'age31_50'),
                        'above50':  g(female, 'above50'),
                    } if female else None,
                },
            }

    countries_out = []
    for code, meta in country_meta.items():
        countries_out.append({
            'code':      code,
            'name':      meta['name'],
            'continent': meta['continent'],
            'lat':       meta['lat'],
            'lon':       meta['lon'],
            'byYear':    country_year_map.get(code, {}),
        })

    # ---- Jenks --------------------------------------------------------------
    print(f'Computing Jenks breaks on {len(all_inflows_for_jenks)} non-zero values…')
    breaks = jenks_breaks(all_inflows_for_jenks, 5)
    jenks_breaks_out = [round(b) for b in breaks]
    print(f'Jenks breaks: {jenks_breaks_out}')

    # ---- Continent arcs per year -------------------------------------------
    continent_arcs: dict[str, dict[str, dict]] = {}
    for year, codes in bucket.items():
        cont_totals: dict[str, int] = defaultdict(int)
        for code, sex_dict in codes.items():
            cont = country_meta[code]['continent']
            for sd in sex_dict.values():
                cont_totals[cont] += sd.get('total', 0)
        continent_arcs[year] = {
            cont: {
                'totalInflow': total,
                'centerLat':   CONTINENT_CENTERS[cont][0],
                'centerLon':   CONTINENT_CENTERS[cont][1],
            }
            for cont, total in cont_totals.items()
            if cont in CONTINENT_CENTERS
        }

    # ---- Output ------------------------------------------------------------
    output = {
        'meta': {
            'years':       [int(y) for y in years_available],
            'continents':  sorted(VALID_CONTINENTS),
            'jenksBreaks': jenks_breaks_out,
        },
        'countries':     countries_out,
        'continentArcs': continent_arcs,
    }

    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

    size_kb = dst.stat().st_size / 1024
    print(f'\nDone! Written to {dst} ({size_kb:.1f} KB)')


if __name__ == '__main__':
    main()
