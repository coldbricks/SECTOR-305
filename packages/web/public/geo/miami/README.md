# Miami GIS basemap (SECTOR plate)

Curated **GeoJSON** from [City of Miami GIS Open Data](https://datahub-miamigis.opendata.arcgis.com/).

## Role

**Basemap atmosphere only** for the prestige sector plate.

- Not official CAD / AVL
- Not player truth pins (doctrine: imperfect last-known)
- SECTOR 305 ops zones remain fictional SE305-A07 overlays

## Radar stack (toggleable on plate)

UI: left **RADAR** panel — click channel LED to toggle, double-click to solo, **DFLT** / **ALL**.

| Short | File | Default |
|-------|------|---------|
| OPS | (fiction SE305 zones) | on |
| BNDY | `city-boundary.geojson` | on |
| DIST | `police-districts.geojson` | on |
| NET | `police-neighborhoods.geojson` | off |
| ZONE | `police-zones.geojson` | off |
| CODE | `code-enforcement.geojson` | off |
| ROAD | `major-roads.geojson` | on |
| EVAC | `evac-routes.geojson` | off |
| FIRE | `fire-stations.geojson` | on |
| LMK | `landmarks.geojson` | off |

CFS / unit **tracks** stay on regardless of radar GIS channels.

## Re-curate

Source downloads live in the operator Downloads folder. Re-run the curation script from a Grok/dev session if Miami GIS refreshes, or replace files and keep property keys used by the plate (`PDDISTNAME`, `SNAME`, `NAME`, …).

## Attribution

City of Miami GIS Open Data · portal: https://datahub-miamigis.opendata.arcgis.com/
