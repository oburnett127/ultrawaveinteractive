const { SitemapStream, streamToPromise } = require('sitemap');
const fs = require('fs');

const routes = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/privacy-policy', changefreq: 'yearly', priority: 0.1 },
  { url: '/terms-of-service', changefreq: 'yearly', priority: 0.1 },
  { url: '/cookie-policy', changefreq: 'yearly', priority: 0.1 },
];

// Generate the sitemap
const generateSitemap = async () => {
  const sitemap = new SitemapStream({ hostname: 'https://ultrawaveinteractive.com' });
  routes.forEach((route) => sitemap.write(route));
  sitemap.end();

  const sitemapXml = await streamToPromise(sitemap).then((data) => data.toString());
  fs.writeFileSync('./public/sitemap.xml', sitemapXml);
  console.log('Sitemap generated successfully!');
};

generateSitemap().catch((err) => {
  console.error('Error generating sitemap:', err);
});
