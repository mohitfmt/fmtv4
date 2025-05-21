import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const landingPageSitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
      <loc>https://www.freemalaysiatoday.com</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/news</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/nation</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/nation/sabahsarawak</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/south-east-asia</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/berita</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/bahasa/tempatan</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/bahasa/pandangan</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>    
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/bahasa/dunia</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/business</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/business/world-business</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/business/local-business</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/lifestyle</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/simple-stories</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/food</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/entertainment</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/health</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/money</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/travel</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/tech</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/pets</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/automotive</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/leisure/property</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/opinion</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/opinion/editorial</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/opinion/column</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/opinion/letters</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/fmt-worldviews</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/world</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/sports</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/sports</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/sports/football</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/sports/badminton</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/sports/motorsports</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/sports/tennis</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/category/category/education</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/photos</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/accelerator</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/videos</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/contact-us</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/about</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/advertise</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>
    <url>
      <loc>https://www.freemalaysiatoday.com/disclaimers-copyright</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>      
    <url>
      <loc>https://www.freemalaysiatoday.com/privacy-policy</loc>
      <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    </url>        
  </urlset>`;

    res.setHeader("Content-Type", "application/xml");
    res.write(landingPageSitemap);
    res.end();
  } catch (err) {
    console.error(
      "[SITEMAP_API_ERROR] Landing Page sitemap Internal Server Error :",
      err
    );
    res
      .status(500)
      .send(
        `[SITEMAP_API_ERROR] Landing Page sitemap Internal Server Error : ${err}`
      );
  }
}
