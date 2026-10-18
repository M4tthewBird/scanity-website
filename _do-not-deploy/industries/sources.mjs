// Sources behind every market statistic on the industry pages. Each one was
// opened and checked: the number quoted on the page is on the linked page.
// Don't add a number without a source like these, and don't round up.
export const SRC = {
  virtuanceSupport: 'https://support.virtuance.com/support/solutions/articles/26000045165-what-are-the-benefits-to-using-a-zillow-3d-home-tour-',
  matterportRe: 'https://matterport.com/blog/3d-tours-properties-sell-31-faster-and-higher-price',
  f8re: 'https://f8re.com/post/matterport-can-deliver-up-to-9-higher-sales-price-for-your-listing',
  virtuanceZillow: 'https://www.virtuance.com/zillow-3d-tours/',
  swinerton: 'https://matterport.com/industries/case-studies/swinerton-uses-matterport-keep-construction-moving-forward',
  knutson: 'https://matterport.com/en-gb/industries/case-studies/knutson-construction-works-more-efficiently-and-safely-matterport',
  burns: 'https://matterport.com/es/news/matterport-partners-burns-mcdonnell-help-energy-utilities-and-manufacturing-industries-save',
  venue: 'https://3ddigitalvenue.com/why-virtual-3d-maps-for-live-events-are-commercial-infrastructure-not-just-visualization/',
  tickx: 'https://www.tickx.com/solutions/view-from-seat',
  cvent: 'https://www.cvent.com/en/blog/hospitality/virtual-venue-tours',
  sayduck: 'https://www.sayduck.com/3d-and-ar-statistics-2022',
  arinsider: 'https://arinsider.co/2020/06/29/does-ar-really-reduce-ecommerce-returns/',
  shopifyAr: 'https://www.shopify.com/enterprise/augmented-reality-ecommerce-shopping',
  seekbeak: 'https://seekbeak.com/efficacy-of-virtual-tours-360-photo-industry-research-round-up/',
};

export const ext = (href, text) => `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

// The scenes on viewer.scanity.cz each page can show
export const SCAN = {
  gym: 'ikka_gym',
  cathedral: 'sanctuaire',
  shield: 'face_shield',
};
