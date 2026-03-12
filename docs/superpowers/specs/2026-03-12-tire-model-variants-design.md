# Tire Model + Variants Redesign

## Overview
Restructure the tires page from flat individual tire listings to a parent model + variant system. Each tire model (e.g., "Sailun Atrezzo") groups multiple size/price variants. Clicking a model navigates to a dedicated detail page with rim size selector.

## Data Model (Directus)

### tire_models
| Field | Type | Notes |
|-------|------|-------|
| id | integer | Auto PK |
| name | string | e.g., "Atrezzo Elite" |
| slug | string | Unique, URL-friendly |
| brand | relation → tire_brands | M2O |
| image | file | Main product image |
| type | string | Summer, All-Season, etc. |
| features | JSON array | Tags |
| description | text | Optional |
| status | string | published / draft |
| sort | integer | Manual ordering |
| variants | O2M alias | → tire_variants |

### tire_variants
| Field | Type | Notes |
|-------|------|-------|
| id | integer | Auto PK |
| tire_model | relation → tire_models | M2O, cascade delete |
| size | string | e.g., "205/55R15" |
| rim_size | integer | e.g., 15 |
| price | integer | PHP |
| original_price | integer | Nullable, triggers sale badge |
| status | string | available / limited / out_of_stock |
| quantity | integer | Stock count |
| sort | integer | Ordering |

## Front-End: Grid Page (/tires)

- One card per tire_model
- Shows: image, brand, model name, type, top 2 features
- Price: "From PHP X,XXX" (lowest priced available variant)
- Sale badge if any variant has original_price
- Stock: dim card if ALL variants out of stock
- Card click → `/tires/[slug]`

### Filters
- Search: matches model name, brand name, variant sizes
- Brand filter: same horizontal scroll buttons
- Rim size filter: shows models with at least one variant in that rim size; "From" price adjusts to lowest in filtered rim size

## Front-End: Detail Page (/tires/[slug])

### Layout
1. Breadcrumb: Tires > Brand > Model Name
2. Hero: large image (left) + brand, name, type, feature tags (right)
3. Rim size selector: horizontal buttons (13" 14" 15"...) — only available sizes shown, first available pre-selected
4. Variants list for selected rim: size, price (strikethrough original if sale), stock badge, "Inquire / Buy" button
5. Description section (if exists)
6. Related tires: other models from same brand

### Inquire/Buy
Same pattern: → /book?service=tire-inquiry&notes=Inquiry for: [name] [size], Brand: [brand], Price: [price]

## Migration
- Old `tires` collection preserved temporarily
- New data entered via Directus admin into tire_models + tire_variants
- Old tires page code replaced with new implementation
