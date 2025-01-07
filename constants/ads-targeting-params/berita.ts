// Main Berita Landing Parameters
export const beritaLandingTargetingParams = {
  pos: "listing",
  section: [
    "berita",
    "landing-page",
    "berita-landing-page",
    "tempatan",
    "pandangan",
    "dunia",
  ],
  key: [
    // General Berita Topics
    "berita-terkini",
    "berita-malaysia",
    "berita-utama",
    "berita-semasa",
    "berita-terhangat",
    "isu-semasa",

    // Common Categories
    "politik",
    "ekonomi",
    "sosial",
    "kesihatan",
    "pendidikan",
    "sukan",
    "hiburan",
    "teknologi",

    // News Types
    "berita-nasional",
    "berita-antarabangsa",
    "rencana",
    "ulasan",
    "laporan-khas",
    "siasatan",

    // Content Format
    "berita-terbaru",
    "artikel-pilihan",
    "pandangan-editor",
    "berita-eksklusif",
    "liputan-khas",
    "isu-terkini",
  ],
  contentType: "berita",
  pageType: "category",
  language: "malay",
  region: ["malaysia", "international"],
};

// Tempatan (Local News) Parameters
export const tempatanBeritaParams = {
  ...beritaLandingTargetingParams,
  section: ["berita", "tempatan"],
  key: [
    // Local News
    "berita-tempatan",
    "isu-tempatan",
    "komuniti",
    "berita-daerah",
    "pihak-berkuasa-tempatan",

    // Malaysian Regions
    "semenanjung-malaysia",
    "malaysia-timur",
    "sabah",
    "sarawak",

    // Local Topics
    "pembangunan-tempatan",
    "infrastruktur",
    "perkhidmatan-awam",
    "keselamatan",
    "pengangkutan-awam",
    "perumahan",
    "alam-sekitar",
    "pendidikan-tempatan",
    "kesihatan-awam",
    "kebajikan-masyarakat",

    // Local Government
    "kerajaan-tempatan",
    "majlis-perbandaran",
    "dewan-bandaraya",
    "pihak-berkuasa",
    "pentadbiran-daerah",
  ],
  region: ["malaysia"],
  coverage: ["local", "regional"],
};

// Pandangan (Opinion) Parameters
export const pandanganBeritaParams = {
  ...beritaLandingTargetingParams,
  section: ["berita", "pandangan"],
  key: [
    // Opinion Types
    "pandangan",
    "pendapat",
    "komen",
    "analisis",
    "ulasan",
    "rencana",
    "kolum",
    "editorial",

    // Opinion Topics
    "isu-semasa",
    "politik-semasa",
    "ekonomi-semasa",
    "sosial-budaya",
    "dasar-awam",
    "hubungan-antarabangsa",
    "isu-nasional",

    // Contributors
    "pakar",
    "penganalisis",
    "kolumnis",
    "penulis-jemputan",
    "sidang-editorial",
    "pemikir",

    // Content Types
    "artikel-pendapat",
    "analisis-mendalam",
    "pandangan-pakar",
    "kritikan-membina",
    "cadangan-penyelesaian",
  ],
  contentType: "opinion",
  authorType: ["columnist", "expert", "editor"],
};

// Dunia (World News) Parameters
export const duniaBeritaParams = {
  ...beritaLandingTargetingParams,
  section: ["berita", "dunia"],
  key: [
    // World Regions
    "asia-tenggara",
    "asia-pasifik",
    "timur-tengah",
    "eropah",
    "amerika",
    "afrika",

    // International Topics
    "politik-antarabangsa",
    "ekonomi-global",
    "hubungan-diplomatik",
    "konflik-antarabangsa",
    "keselamatan-global",
    "isu-antarabangsa",

    // Global Issues
    "perubahan-iklim",
    "hak-asasi",
    "keganasan",
    "kesihatan-global",
    "teknologi-global",
    "perdagangan-antarabangsa",

    // International Organizations
    "pertubuhan-bangsa-bangsa-bersatu",
    "asean",
    "who",
    "bank-dunia",
    "wto",

    // Coverage Areas
    "berita-antarabangsa",
    "laporan-global",
    "analisis-antarabangsa",
    "perkembangan-dunia",
    "isu-global",
  ],
  region: ["international"],
  coverage: ["global", "international"],
  contentType: ["world-news", "international-affairs"],
};
