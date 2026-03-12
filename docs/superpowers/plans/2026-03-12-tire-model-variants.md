# Tire Model + Variants Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the tires page from flat listings to a parent model + variant system with dedicated detail pages and rim size selectors.

**Architecture:** Two new Directus collections (`tire_models`, `tire_variants`) already created. Grid page shows one card per model with "From" pricing. Detail page at `/tires/[slug]` shows rim size tabs and variant list. All data fetched at build time via Directus REST API.

**Tech Stack:** Astro 5, Tailwind CSS 4, Directus REST API, client-side JS for interactivity.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/directus.js` | Modify | Add `getTireModels()`, `getTireModelBySlug()` fetch functions |
| `src/pages/tires/index.astro` | Rewrite | Grid page with model cards, "From" pricing, filters |
| `src/pages/tires/[slug].astro` | Create | Dynamic detail page with rim size selector + variants |

---

## Chunk 1: API Layer

### Task 1: Add tire model fetch functions to directus.js

**Files:**
- Modify: `src/lib/directus.js`

- [ ] **Step 1: Add `getTireModels()` function**

Add after the existing `getTires()` function in `src/lib/directus.js`:

```javascript
/**
 * Get all tire models with their variants and brand info
 */
export async function getTireModels() {
  const models = await fetchFromDirectus('tire_models', {
    'fields[]': '*,variants.*,brand.id,brand.name',
    'filter[status][_eq]': 'published',
    sort: 'sort'
  });

  if (!models) return null;
  return models;
}
```

- [ ] **Step 2: Add `getTireModelBySlug()` function**

Add directly after `getTireModels()`:

```javascript
/**
 * Get a single tire model by slug with variants and brand
 */
export async function getTireModelBySlug(slug) {
  const models = await fetchFromDirectus('tire_models', {
    'fields[]': '*,variants.*,brand.id,brand.name',
    'filter[slug][_eq]': slug,
    'filter[status][_eq]': 'published',
    limit: 1
  });

  if (!models || models.length === 0) return null;
  return models[0];
}
```

- [ ] **Step 3: Add `getRelatedTireModels()` function**

Add directly after `getTireModelBySlug()`:

```javascript
/**
 * Get other tire models from the same brand (for related section)
 */
export async function getRelatedTireModels(brandId, excludeModelId) {
  const models = await fetchFromDirectus('tire_models', {
    'fields[]': '*,variants.*,brand.id,brand.name',
    'filter[status][_eq]': 'published',
    'filter[brand][_eq]': brandId,
    'filter[id][_neq]': excludeModelId,
    limit: 4
  });

  return models || [];
}
```

- [ ] **Step 4: Test the API functions**

Run the dev server and test in browser console or add a temporary log:

```bash
npm run dev
```

Visit `/tires` and verify no errors in terminal. (Data will be empty until models are added in Directus, but no crashes.)

- [ ] **Step 5: Commit**

```bash
git add src/lib/directus.js
git commit -m "feat: add tire model and variant API functions"
```

---

## Chunk 2: Grid Page Rewrite

### Task 2: Rewrite the tires grid page

**Files:**
- Rewrite: `src/pages/tires/index.astro`

- [ ] **Step 1: Rewrite the frontmatter (data fetching + helpers)**

Replace the entire frontmatter block (`---` to `---`) with:

```javascript
---
import MainLayout from '../../layouts/MainLayout.astro';
import { getTireModels, getImageUrl, formatPrice, getSiteSettings, getTireBrands } from '../../lib/directus.js';

const fallbackBrands = ['Sailun', 'Radar', 'Comforser', 'Thunderer', 'Apollo', 'Toyo', 'Dunlop', 'Bridgestone', 'MRF', 'Westlake', 'Deestone', 'Maxxis', 'Yokohama', 'Prinx', 'Goodyear', 'BFGoodrich', 'Arivo'];

const directusModels = await getTireModels();
const directusBrands = await getTireBrands();
const allBrands = directusBrands?.map(b => b.name) || fallbackBrands;
const siteSettings = await getSiteSettings();
const phoneNumber = siteSettings?.phone || '+639XXXXXXXXX';

const models = directusModels || [];
const brands = ['All', ...allBrands];

// Build set of all available rim sizes from variants
const allRimSizes = [...new Set(
  models.flatMap(m => (m.variants || []).map(v => v.rim_size))
)].sort((a, b) => a - b);

// Helper: get the lowest price from a model's variants
function getFromPrice(model, rimSize = null) {
  const variants = (model.variants || []).filter(v => v.status !== 'out_of_stock' && v.quantity > 0);
  const filtered = rimSize ? variants.filter(v => v.rim_size === rimSize) : variants;
  if (filtered.length === 0) {
    // Fall back to all variants if none available
    const all = rimSize ? (model.variants || []).filter(v => v.rim_size === rimSize) : (model.variants || []);
    if (all.length === 0) return null;
    return Math.min(...all.map(v => v.price));
  }
  return Math.min(...filtered.map(v => v.price));
}

// Helper: check if model has any variant on sale
function hasAnySale(model) {
  return (model.variants || []).some(v => v.original_price);
}

// Helper: check if ALL variants are out of stock
function isModelOutOfStock(model) {
  const variants = model.variants || [];
  if (variants.length === 0) return true;
  return variants.every(v => v.status === 'out_of_stock' || v.quantity === 0);
}

// Helper: get brand name from model
function getBrandName(model) {
  if (typeof model.brand === 'object' && model.brand?.name) return model.brand.name;
  if (typeof model.brand === 'string') return model.brand;
  return 'Other';
}

// Helper: get comma-separated variant sizes for search matching
function getVariantSizes(model) {
  return (model.variants || []).map(v => v.size?.toLowerCase() || '').join(',');
}

// Helper: get comma-separated rim sizes for filtering
function getVariantRimSizes(model) {
  return [...new Set((model.variants || []).map(v => String(v.rim_size)))].join(',');
}
---
```

- [ ] **Step 2: Write the HTML template (header + filters)**

Replace everything from `<MainLayout` to the end of the filter section with:

```astro
<MainLayout
  title="Tires"
  description="Browse quality tires from top brands - Sailun, Radar, Comforser, Thunderer, Apollo, Toyo, Dunlop. Available at WheelPower Auto Shop in Baras, Rizal."
>

  <!-- Page Header -->
  <section class="bg-gradient-to-b from-dark-900 to-dark-950 py-16 md:py-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <p class="section-subtitle">Our Products</p>
      <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">Tires</h1>
      <p class="text-dark-300 text-lg max-w-2xl mx-auto">
        Quality tires from trusted brands. Find the perfect tires for your vehicle and budget.
      </p>
      <div class="inline-flex items-center gap-3 mt-5 px-6 py-3 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-base">
        <span class="text-lg">&#10003;</span>
        All listed tires include free mounting and installation
      </div>
    </div>
  </section>

  <!-- Search and Brand Filter -->
  <section class="py-4 md:py-8 border-b border-dark-800 sticky top-16 md:top-20 bg-dark-950/95 backdrop-blur-md z-30">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex gap-3 max-w-xl mx-auto mb-4">
        <div class="relative flex-1">
          <input
            type="text"
            id="tire-search"
            placeholder="Search brand, model, or size..."
            class="input-field px-4 pr-10"
          />
          <button id="clear-search" class="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white hidden">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <svg id="search-icon" class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div class="relative">
          <select
            id="rim-size-filter"
            class="input-field appearance-none pr-10 min-w-[120px] cursor-pointer"
          >
            <option value="all">All Rims</option>
            {allRimSizes.map((size) => (
              <option value={String(size)}>{size}"</option>
            ))}
          </select>
          <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div class="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div class="flex gap-2 md:flex-wrap md:justify-center min-w-max md:min-w-0">
          {brands.map((brand) => (
            <button
              class="brand-filter px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap data-[active=true]:bg-primary-500 data-[active=true]:border-primary-500 data-[active=true]:text-white border-dark-600 text-dark-300 hover:border-primary-500/50 hover:text-white"
              data-brand={brand.toLowerCase()}
              data-active={brand === 'All' ? 'true' : 'false'}
            >
              {brand}
            </button>
          ))}
        </div>
      </div>
    </div>
  </section>
```

- [ ] **Step 3: Write the model cards grid**

Continue the template after the filter section:

```astro
  <!-- Models Grid -->
  <section class="py-12 md:py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div class="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p class="text-dark-400">
          Showing <span id="tire-count" class="text-white font-medium">{models.length}</span> tires
        </p>
        <p class="text-dark-500 text-sm">
          Prices are per tire. Free installation included.
        </p>
      </div>

      <div id="tires-grid" class="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {models.map((model) => {
          const brandName = getBrandName(model);
          const outOfStock = isModelOutOfStock(model);
          const fromPrice = getFromPrice(model);
          const onSale = hasAnySale(model);

          return (
            <a
              href={`/tires/${model.slug}`}
              class={`tire-card card overflow-hidden group block ${outOfStock ? 'opacity-60' : ''}`}
              data-brand={brandName.toLowerCase()}
              data-name={model.name?.toLowerCase() || ''}
              data-sizes={getVariantSizes(model)}
              data-rims={getVariantRimSizes(model)}
              data-from-prices={JSON.stringify(
                Object.fromEntries(
                  allRimSizes.map(r => [r, getFromPrice(model, r)])
                )
              )}
            >
              <!-- Image -->
              <div class="aspect-square bg-gradient-to-br from-dark-800 to-dark-900 relative overflow-hidden flex items-center justify-center">
                {model.image ? (
                  <img
                    src={getImageUrl(model.image)}
                    alt={model.name}
                    class="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div class="text-center">
                    <div class="text-6xl mb-2">🔘</div>
                    <p class="text-dark-500 text-xs capitalize">{brandName}</p>
                  </div>
                )}

                {outOfStock && (
                  <div class="absolute top-3 left-3">
                    <span class="px-2 py-1 rounded-full text-xs font-medium border bg-red-500/20 text-red-400 border-red-500/30">
                      Out of Stock
                    </span>
                  </div>
                )}

                {onSale && !outOfStock && (
                  <div class="absolute top-3 right-3">
                    <span class="px-2 py-1 bg-primary-500 text-white rounded-full text-xs font-bold">
                      SALE
                    </span>
                  </div>
                )}
              </div>

              <!-- Info -->
              <div class="p-4">
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-primary-400 text-sm font-medium capitalize">{brandName}</span>
                  {model.type && (
                    <>
                      <span class="text-dark-600">&bull;</span>
                      <span class="text-dark-400 text-sm">{model.type}</span>
                    </>
                  )}
                </div>

                <h3 class="font-bold text-white group-hover:text-primary-400 transition-colors mb-1">
                  {model.name}
                </h3>

                {model.features && model.features.length > 0 && (
                  <div class="flex flex-wrap gap-1 mb-3">
                    {model.features.slice(0, 2).map((feature) => (
                      <span class="px-2 py-0.5 bg-dark-800 rounded text-xs text-dark-300">
                        {feature}
                      </span>
                    ))}
                  </div>
                )}

                <div class="flex items-baseline gap-1">
                  {fromPrice ? (
                    <>
                      <span class="text-dark-400 text-sm">From</span>
                      <span class="text-lg font-bold text-white from-price">{formatPrice(fromPrice)}</span>
                    </>
                  ) : (
                    <span class="text-dark-400 text-sm">Contact for price</span>
                  )}
                </div>
              </div>
            </a>
          );
        })}
      </div>

      <!-- More Tires CTA -->
      <div class="text-center py-12 mt-8 border-t border-dark-800">
        <div class="text-5xl mb-4">🔘</div>
        <h3 class="text-xl font-bold text-white mb-2">More tires available at our shop!</h3>
        <p class="text-dark-400 mb-6">We have more sizes and brands in stock. Visit us or get in touch to see our full collection.</p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/contact" class="btn-secondary">Contact Us</a>
          <a href={`tel:${phoneNumber}`} class="btn-primary">Call Us</a>
        </div>
      </div>
    </div>
  </section>

  <!-- Info Section -->
  <section class="py-16 bg-dark-900/50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="text-4xl mb-4">🚗</div>
          <h3 class="font-bold text-white mb-2">Free Size Consultation</h3>
          <p class="text-dark-400 text-sm">Not sure what size you need? We'll help you find the right fit for your vehicle.</p>
        </div>
        <div class="text-center">
          <div class="text-4xl mb-4">🔧</div>
          <h3 class="font-bold text-white mb-2">Installation Available</h3>
          <p class="text-dark-400 text-sm">Purchase includes professional installation at our shop.</p>
        </div>
        <div class="text-center">
          <div class="text-4xl mb-4">💰</div>
          <h3 class="font-bold text-white mb-2">Best Price Guarantee</h3>
          <p class="text-dark-400 text-sm">Competitive prices on all tire brands. Ask about our promos!</p>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="text-2xl md:text-3xl font-bold text-white mb-4">
        Can't Find What You're Looking For?
      </h2>
      <p class="text-dark-300 mb-8">
        We may have more sizes and brands in stock. Contact us with your vehicle details
        and we'll find the perfect tires for you.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/contact" class="btn-secondary">Send Inquiry</a>
        <a href={`tel:${phoneNumber}`} class="btn-primary">Call Us</a>
      </div>
    </div>
  </section>

</MainLayout>
```

- [ ] **Step 4: Write the client-side filter script**

Add after `</MainLayout>`:

```html
<script>
  const filterButtons = document.querySelectorAll('.brand-filter');
  const tireCards = document.querySelectorAll('.tire-card');
  const tireCount = document.getElementById('tire-count');
  const tiresGrid = document.getElementById('tires-grid');
  const searchInput = document.getElementById('tire-search');
  const clearSearchBtn = document.getElementById('clear-search');
  const searchIcon = document.getElementById('search-icon');
  const rimSizeFilter = document.getElementById('rim-size-filter');

  let currentBrand = 'all';
  let currentSearch = '';
  let currentRimSize = 'all';

  function filterTires() {
    let visibleCount = 0;

    tireCards.forEach((card) => {
      const cardBrand = card.dataset.brand || '';
      const cardName = card.dataset.name || '';
      const cardSizes = card.dataset.sizes || '';
      const cardRims = card.dataset.rims || '';

      const matchesBrand = currentBrand === 'all' || cardBrand === currentBrand;
      const matchesRim = currentRimSize === 'all' || cardRims.split(',').includes(currentRimSize);

      const searchTerm = currentSearch.toLowerCase().trim();
      const matchesSearch = searchTerm === '' ||
        cardBrand.includes(searchTerm) ||
        cardName.includes(searchTerm) ||
        cardSizes.includes(searchTerm);

      const shouldShow = matchesBrand && matchesSearch && matchesRim;

      if (shouldShow) {
        card.style.display = 'block';
        visibleCount++;

        // Update "From" price based on rim size filter
        const fromPriceEl = card.querySelector('.from-price');
        if (fromPriceEl && currentRimSize !== 'all') {
          try {
            const prices = JSON.parse(card.dataset.fromPrices || '{}');
            const rimPrice = prices[currentRimSize];
            if (rimPrice) {
              fromPriceEl.textContent = '₱' + Number(rimPrice).toLocaleString();
            }
          } catch (e) {}
        } else if (fromPriceEl) {
          // Reset to original "from" price when "All Rims" selected
          // Re-read the minimum from all rim prices
          try {
            const prices = JSON.parse(card.dataset.fromPrices || '{}');
            const allPrices = Object.values(prices).filter(p => p !== null);
            if (allPrices.length > 0) {
              fromPriceEl.textContent = '₱' + Number(Math.min(...allPrices)).toLocaleString();
            }
          } catch (e) {}
        }
      } else {
        card.style.display = 'none';
      }
    });

    if (tireCount) tireCount.textContent = visibleCount.toString();

    filterButtons.forEach((btn) => {
      btn.dataset.active = (btn.dataset.brand === currentBrand).toString();
    });

    if (clearSearchBtn && searchIcon) {
      if (currentSearch) {
        clearSearchBtn.classList.remove('hidden');
        searchIcon.classList.add('hidden');
      } else {
        clearSearchBtn.classList.add('hidden');
        searchIcon.classList.remove('hidden');
      }
    }
  }

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      currentBrand = btn.dataset.brand || 'all';
      filterTires();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      filterTires();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        currentSearch = '';
        filterTires();
      }
    });
  }

  if (rimSizeFilter) {
    rimSizeFilter.addEventListener('change', (e) => {
      currentRimSize = e.target.value;
      filterTires();
    });
  }

  // URL params
  const urlParams = new URLSearchParams(window.location.search);
  const brandParam = urlParams.get('brand');
  const rimParam = urlParams.get('rim');

  if (brandParam) currentBrand = brandParam.toLowerCase();
  if (rimParam) {
    currentRimSize = rimParam;
    if (rimSizeFilter) rimSizeFilter.value = rimParam;
  }

  filterTires();
</script>
```

- [ ] **Step 5: Verify the grid page builds**

```bash
npm run build
```

Expected: Build completes without errors.

- [ ] **Step 6: Commit**

```bash
git add src/pages/tires/index.astro
git commit -m "feat: rewrite tires grid page for model+variant system"
```

---

## Chunk 3: Detail Page

### Task 3: Create the tire detail page

**Files:**
- Create: `src/pages/tires/[slug].astro`

- [ ] **Step 1: Create the detail page with full layout**

Create `src/pages/tires/[slug].astro`:

```astro
---
import MainLayout from '../../layouts/MainLayout.astro';
import { getTireModels, getTireModelBySlug, getRelatedTireModels, getImageUrl, formatPrice, getSiteSettings } from '../../lib/directus.js';

// Generate static paths for all tire models
export async function getStaticPaths() {
  const models = await getTireModels();
  if (!models) return [];
  return models.map((model) => ({
    params: { slug: model.slug },
  }));
}

const { slug } = Astro.params;
const model = await getTireModelBySlug(slug);

if (!model) {
  return Astro.redirect('/tires');
}

const siteSettings = await getSiteSettings();
const phoneNumber = siteSettings?.phone || '+639XXXXXXXXX';

// Get brand name
const brandName = typeof model.brand === 'object' && model.brand?.name ? model.brand.name : typeof model.brand === 'string' ? model.brand : 'Other';
const brandId = typeof model.brand === 'object' ? model.brand.id : model.brand;

// Get related models
const relatedModels = await getRelatedTireModels(brandId, model.id);

// Organize variants by rim size
const variants = model.variants || [];
const variantsByRim = {};
variants.forEach(v => {
  const rim = v.rim_size;
  if (!variantsByRim[rim]) variantsByRim[rim] = [];
  variantsByRim[rim].push(v);
});

// Sort rim sizes and sort variants within each rim by price
const rimSizes = Object.keys(variantsByRim).map(Number).sort((a, b) => a - b);
rimSizes.forEach(rim => {
  variantsByRim[rim].sort((a, b) => a.price - b.price);
});

// Status badge helper
function getStatusBadge(status, quantity) {
  if (status === 'out_of_stock' || quantity === 0) {
    return { text: 'Out of Stock', class: 'bg-red-500/20 text-red-400 border-red-500/30' };
  }
  if (status === 'limited' || (quantity && quantity <= 3)) {
    return { text: `Only ${quantity} left`, class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  }
  return { text: 'In Stock', class: 'bg-green-500/20 text-green-400 border-green-500/30' };
}

// Helper for related models
function getFromPrice(m) {
  const vs = (m.variants || []).filter(v => v.status !== 'out_of_stock' && v.quantity > 0);
  if (vs.length === 0) {
    const all = m.variants || [];
    if (all.length === 0) return null;
    return Math.min(...all.map(v => v.price));
  }
  return Math.min(...vs.map(v => v.price));
}

function getRelatedBrandName(m) {
  if (typeof m.brand === 'object' && m.brand?.name) return m.brand.name;
  if (typeof m.brand === 'string') return m.brand;
  return 'Other';
}
---

<MainLayout
  title={`${model.name} - ${brandName} | Tires`}
  description={`${brandName} ${model.name} tires. Available in ${rimSizes.map(r => r + '"').join(', ')} rim sizes. Free mounting and installation at WheelPower Auto Shop.`}
>

  <!-- Breadcrumb -->
  <section class="bg-dark-950 pt-6 pb-2">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex items-center gap-2 text-sm text-dark-400">
        <a href="/tires" class="hover:text-primary-400 transition-colors">Tires</a>
        <span>&rsaquo;</span>
        <a href={`/tires?brand=${brandName.toLowerCase()}`} class="hover:text-primary-400 transition-colors">{brandName}</a>
        <span>&rsaquo;</span>
        <span class="text-white">{model.name}</span>
      </nav>
    </div>
  </section>

  <!-- Hero Section -->
  <section class="bg-gradient-to-b from-dark-950 to-dark-900 py-8 md:py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-2 gap-8 md:gap-12 items-center">

        <!-- Image -->
        <div class="aspect-square bg-gradient-to-br from-dark-800 to-dark-900 rounded-2xl overflow-hidden flex items-center justify-center">
          {model.image ? (
            <img
              src={getImageUrl(model.image)}
              alt={`${brandName} ${model.name}`}
              class="w-full h-full object-contain p-4"
            />
          ) : (
            <div class="text-center">
              <div class="text-8xl mb-4">🔘</div>
              <p class="text-dark-500 capitalize">{brandName}</p>
            </div>
          )}
        </div>

        <!-- Details -->
        <div>
          <span class="text-primary-400 font-medium text-lg">{brandName}</span>
          <h1 class="text-3xl md:text-4xl font-bold text-white mt-1 mb-3">{model.name}</h1>

          {model.type && (
            <span class="inline-block px-3 py-1 bg-dark-800 rounded-full text-sm text-dark-300 mb-4">
              {model.type}
            </span>
          )}

          {model.features && model.features.length > 0 && (
            <div class="flex flex-wrap gap-2 mb-6">
              {model.features.map((feature) => (
                <span class="px-3 py-1 bg-primary-500/10 text-primary-400 rounded-full text-sm border border-primary-500/20">
                  {feature}
                </span>
              ))}
            </div>
          )}

          <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 font-medium text-sm">
            <span>&#10003;</span>
            Free mounting and installation
          </div>

          {model.description && (
            <p class="text-dark-300 mt-6 leading-relaxed">{model.description}</p>
          )}
        </div>
      </div>
    </div>
  </section>

  <!-- Rim Size Selector + Variants -->
  <section class="py-8 md:py-12">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <h2 class="text-xl font-bold text-white mb-6">Available Sizes & Prices</h2>

      <!-- Rim Size Tabs -->
      {rimSizes.length > 0 ? (
        <>
          <div class="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            {rimSizes.map((rim, index) => (
              <button
                class="rim-tab px-5 py-2.5 rounded-full text-sm font-medium border transition-all whitespace-nowrap"
                data-rim={rim}
                data-active={index === 0 ? 'true' : 'false'}
              >
                {rim}"
              </button>
            ))}
          </div>

          <!-- Variant Lists (one per rim size) -->
          {rimSizes.map((rim, index) => (
            <div
              class={`rim-panel space-y-3 ${index === 0 ? '' : 'hidden'}`}
              data-rim-panel={rim}
            >
              {variantsByRim[rim].map((variant) => {
                const badge = getStatusBadge(variant.status, variant.quantity);
                const isOut = variant.status === 'out_of_stock' || variant.quantity === 0;

                return (
                  <div class={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-dark-900 border border-dark-800 ${isOut ? 'opacity-60' : ''}`}>
                    <div class="flex items-center gap-4 flex-1">
                      <span class="text-white font-bold text-lg min-w-[140px]">{variant.size}</span>
                      <span class={`px-2 py-1 rounded-full text-xs font-medium border ${badge.class}`}>
                        {badge.text}
                      </span>
                    </div>

                    <div class="flex items-center gap-4">
                      <div class="text-right">
                        <span class="text-xl font-bold text-white">{formatPrice(variant.price)}</span>
                        {variant.original_price && (
                          <span class="text-dark-500 line-through text-sm ml-2">{formatPrice(variant.original_price)}</span>
                        )}
                      </div>

                      {isOut ? (
                        <button disabled class="px-5 py-2.5 rounded-lg bg-dark-800 text-dark-500 font-medium cursor-not-allowed text-sm">
                          Out of Stock
                        </button>
                      ) : (
                        <a
                          href={`/book?service=tire-inquiry&notes=${encodeURIComponent(`Inquiry for: ${model.name}\nBrand: ${brandName}\nSize: ${variant.size}\nPrice: ${formatPrice(variant.price)}`)}`}
                          class="px-5 py-2.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-medium text-sm transition-colors whitespace-nowrap"
                        >
                          Inquire / Buy
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </>
      ) : (
        <div class="text-center py-12">
          <p class="text-dark-400">No sizes available yet. Contact us for availability.</p>
          <a href={`tel:${phoneNumber}`} class="btn-primary mt-4 inline-block">Call Us</a>
        </div>
      )}
    </div>
  </section>

  <!-- Related Tires -->
  {relatedModels.length > 0 && (
    <section class="py-12 border-t border-dark-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-xl font-bold text-white mb-6">More from {brandName}</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {relatedModels.map((related) => {
            const relBrand = getRelatedBrandName(related);
            const relPrice = getFromPrice(related);

            return (
              <a href={`/tires/${related.slug}`} class="card overflow-hidden group block">
                <div class="aspect-square bg-gradient-to-br from-dark-800 to-dark-900 flex items-center justify-center overflow-hidden">
                  {related.image ? (
                    <img
                      src={getImageUrl(related.image)}
                      alt={related.name}
                      class="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div class="text-6xl">🔘</div>
                  )}
                </div>
                <div class="p-4">
                  <span class="text-primary-400 text-sm font-medium">{relBrand}</span>
                  <h3 class="font-bold text-white group-hover:text-primary-400 transition-colors">
                    {related.name}
                  </h3>
                  {relPrice && (
                    <p class="text-dark-400 text-sm mt-1">From <span class="text-white font-medium">{formatPrice(relPrice)}</span></p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  )}

  <!-- CTA -->
  <section class="py-16 bg-dark-900/50">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 class="text-2xl font-bold text-white mb-4">Need Help Choosing?</h2>
      <p class="text-dark-300 mb-8">
        Not sure which size fits your vehicle? Contact us and we'll help you find the right match.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a href="/contact" class="btn-secondary">Send Inquiry</a>
        <a href={`tel:${phoneNumber}`} class="btn-primary">Call Us</a>
      </div>
    </div>
  </section>

</MainLayout>

<!-- Rim Size Tab Script -->
<script>
  const rimTabs = document.querySelectorAll('.rim-tab');
  const rimPanels = document.querySelectorAll('.rim-panel');

  rimTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const selectedRim = tab.dataset.rim;

      // Update tab active states
      rimTabs.forEach(t => {
        t.dataset.active = (t.dataset.rim === selectedRim).toString();
      });

      // Show/hide panels
      rimPanels.forEach(panel => {
        if (panel.dataset.rimPanel === selectedRim) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });
    });
  });
</script>
```

- [ ] **Step 2: Add rim tab active styling**

The rim tabs use `data-active` attribute. The existing Tailwind pattern from brand filters uses `data-[active=true]:` which should work. Verify that the `rim-tab` buttons get proper styling by checking the existing pattern in the brand filter. Add this to the rim-tab class if needed — they should use the same pattern:

```
data-[active=true]:bg-primary-500 data-[active=true]:border-primary-500 data-[active=true]:text-white border-dark-600 text-dark-300 hover:border-primary-500/50 hover:text-white
```

Update the rim-tab button class to include these data-active styles (same as brand filter buttons).

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Build succeeds. Pages generated for each tire model slug.

- [ ] **Step 4: Commit**

```bash
git add src/pages/tires/[slug].astro
git commit -m "feat: add tire model detail page with rim size selector"
```

---

## Chunk 4: Visual Testing & Polish

### Task 4: Test with sample data and fix issues

- [ ] **Step 1: Add a sample tire model in Directus**

Via Directus admin UI (or API), create a test tire model:
- Name: "Atrezzo Elite"
- Slug: "atrezzo-elite"
- Brand: Sailun (from tire_brands)
- Type: "All-Season"
- Features: ["Fuel Efficient", "Low Noise"]
- Status: published

Add 3-4 variants:
- 185/65R14, rim 14, price 2500, available, qty 10
- 195/60R15, rim 15, price 2800, available, qty 5
- 205/55R15, rim 15, price 3200, available, qty 3
- 205/55R16, rim 16, price 3500, available, qty 8

- [ ] **Step 2: Run dev server and test grid page**

```bash
npm run dev
```

Visit `/tires`:
- Verify model card appears with "From ₱2,500"
- Verify brand filter works
- Verify rim size filter shows model only when matching rim is selected
- Verify "From" price updates when rim size filter is applied

- [ ] **Step 3: Test detail page**

Visit `/tires/atrezzo-elite`:
- Verify breadcrumb links work
- Verify rim size tabs (14, 15, 16) appear
- Verify clicking 15" shows two variants (195/60R15 and 205/55R15)
- Verify "Inquire / Buy" links go to correct booking URL
- Verify related section shows other Sailun models (if any)

- [ ] **Step 4: Test responsiveness**

Check both pages at mobile (375px) and desktop widths.

- [ ] **Step 5: Fix any issues found and commit**

```bash
git add -A
git commit -m "fix: polish tire model pages after visual testing"
```
