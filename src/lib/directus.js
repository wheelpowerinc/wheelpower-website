// Directus API Helper
// This file connects your website to your Directus backend

const DIRECTUS_URL = 'https://directus-production-2cc1.up.railway.app';

/**
 * Fetch data from Directus API
 */
async function fetchFromDirectus(endpoint, params = {}) {
  const url = new URL(`${DIRECTUS_URL}/items/${endpoint}`);
  
  // Add query parameters
  Object.keys(params).forEach(key => {
    if (params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });

  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

/**
 * Get all services
 */
export async function getServices() {
  return await fetchFromDirectus('services', {
    sort: 'sort',
    'filter[status][_eq]': 'available'
  });
}

/**
 * Get all tires
 */
export async function getTires() {
  return await fetchFromDirectus('tires', {
    sort: '-date_created',
    'filter[status][_neq]': 'unavailable'
  });
}

/**
 * Get all mags
 */
export async function getMags() {
  return await fetchFromDirectus('mags', {
    sort: '-date_created',
    'filter[status][_neq]': 'unavailable'
  });
}

/**
 * Get all gallery items
 */
export async function getGallery() {
  return await fetchFromDirectus('gallery', {
    sort: 'sort',
    'filter[status][_eq]': 'published'
  });
}

/**
 * Get site settings
 */
export async function getSiteSettings() {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/site_settings`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching site settings:', error);
    return null;
  }
}

/**
 * Submit a booking request
 */
export async function createBooking(bookingData) {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...bookingData,
        status: 'pending',
        date_created: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error creating booking:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit a contact form message
 */
export async function createContact(contactData) {
  try {
    const response = await fetch(`${DIRECTUS_URL}/items/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...contactData,
        date_created: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Error creating contact:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get image URL from Directus
 */
export function getImageUrl(imageId) {
  if (!imageId) return null;
  return `${DIRECTUS_URL}/assets/${imageId}`;
}

/**
 * Format price to Philippine Peso
 */
export function formatPrice(price) {
  if (!price) return 'Contact for price';
  return '₱' + Number(price).toLocaleString();
}

// Export the base URL for use in components
export const directusUrl = DIRECTUS_URL;