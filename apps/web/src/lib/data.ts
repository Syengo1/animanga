export interface ProjectData {
  x_position: number;
  y_position: number;
  z_position: number;
  width: number;
  opacity: number;
  image: {
    dimensions: { width: number; height: number };
    url: string;
    id: string;
  };
  project: {
    id: string;
    data: {
      title: string;
      description: string;
    };
  };
}

export interface CalculatedProjectData extends ProjectData {
  id: string; // Used as the unique React key
  calcWidth: number;
  calcHeight: number;
  xPos: number;
  yPos: number;
  zPos: number;
  baseOpacity: number;
}

export const projectsData: ProjectData[] = [
  {
    image: {
      dimensions: { width: 736, height: 1144 },
      url: "/assets/hero/makizenin.avif",
      id: "ZzcVoq8jQArT051s",
    },
    x_position: -123,
    y_position: 2063,
    z_position: 0,
    width: 318,
    opacity: 1,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1770, height: 800 },
      url: "/assets/hero/mustangenvy.avif",
      id: "ZzcWka8jQArT052P",
    },
    x_position: 363,
    y_position: 818,
    z_position: 0.1,
    width: 376,
    opacity: 0.8,
    project: {
      id: "ZzcSJhAAACYA5Jr5",
      data: {
        title: "JUSTICE LEAGUE WARWORLD",
        description:
          "For\nJustice League: Warworld\n, Michael relished\nthe opportunity to score these iconic\ncharacters in bold and unexpected ways,\nshaping a musical odyssey that reflected the\nfilm’s genre-hopping adventure.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/vagabond.avif",
      id: "ZzcXHa8jQArT052a",
    },
    x_position: 746,
    y_position: 742,
    z_position: 0,
    width: 120,
    opacity: 0.3,
    project: {
      id: "ZzcSMxAAACYA5JsU",
      data: {
        title: "SHARK WEEK",
        description:
          "As Michael transitioned from scoring commercials to long-form film and television, one of his first major projects was a documentary for Discovery Channel’s SHARK WEEK.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 675, height: 1200 },
      url: "/assets/hero/spikecrewpot.avif",
      id: "ZzcXga8jQArT0520",
    },
    x_position: 546,
    y_position: 242,
    z_position: 0,
    width: 109,
    opacity: 0.5,
    project: {
      id: "ZzcSMxAAACYA5JsU",
      data: {
        title: "SHARK WEEK",
        description:
          "As Michael transitioned from scoring commercials to long-form film and television, one of his first major projects was a documentary for Discovery Channel’s SHARK WEEK.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 675, height: 1200 },
      url: "/assets/hero/haikyuu.avif",
      id: "ZzcX468jQArT052_",
    },
    x_position: 224,
    y_position: 1341,
    z_position: 0,
    width: 166,
    opacity: 0.5,
    project: {
      id: "ZzcSSRAAACcA5JtJ",
      data: {
        title: "KITE MAN HELL YEAH!",
        description:
          "Praised as one of the top ten new shows in 2024 by Rolling Stone, the series follows the saucy adventures of Kite Man and his girlfriend Golden Glider who live together in Noonan's, Gotham's seediest dive bar.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 720, height: 720 },
      url: "/assets/hero/sevenbo.avif",
      id: "ZzcY6a8jQArT053_",
    },
    x_position: 1447,
    y_position: 783,
    z_position: 0.2,
    width: 266,
    opacity: 0.3,
    project: {
      id: "ZzcSJhAAACYA5Jr5",
      data: {
        title: "JUSTICE LEAGUE WARWORLD",
        description:
          "For\nJustice League: Warworld\n, Michael relished\nthe opportunity to score these iconic\ncharacters in bold and unexpected ways,\nshaping a musical odyssey that reflected the\nfilm’s genre-hopping adventure.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 251, height: 305 },
      url: "/assets/hero/drstoneposter.avif",
      id: "ZzcZoa8jQArT0547",
    },
    x_position: 525,
    y_position: 1864,
    z_position: 0,
    width: 125,
    opacity: 0.3,
    project: {
      id: "ZzcSMxAAACYA5JsU",
      data: {
        title: "SHARK WEEK",
        description:
          "As Michael transitioned from scoring commercials to long-form film and television, one of his first major projects was a documentary for Discovery Channel’s SHARK WEEK.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1198, height: 674 },
      url: "/assets/hero/thorfinvthorkell.avif",
      id: "Z6TLdpbqstJ9-Tje",
    },
    x_position: 537,
    y_position: 2116,
    z_position: 0,
    width: 343,
    opacity: 1,
    project: {
      id: "ZzcSGRAAACUA5Jre",
      data: {
        title: "TEEN TITANS DC SUPER HERO GIRLS",
        description:
          "Michael spent three exciting seasons creating the music for the DC Super Hero Girls\nseries reboot. Across 78 episodes, he developed signature sounds and themes for over 50 characters from the DC Universe.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 720, height: 720 },
      url: "/assets/hero/seven.avif",
      id: "Zzcag68jQArT056O",
    },
    x_position: 143,
    y_position: 1798,
    z_position: 0,
    width: 101,
    opacity: 0.5,
    project: {
      id: "ZzcSMxAAACYA5JsU",
      data: {
        title: "SHARK WEEK",
        description:
          "As Michael transitioned from scoring commercials to long-form film and television, one of his first major projects was a documentary for Discovery Channel’s SHARK WEEK.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/x.avif",
      id: "Zzca5a8jQArT056b",
    },
    x_position: 172,
    y_position: 2703,
    z_position: 0,
    width: 351,
    opacity: 0.3,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/sunrakuvwethermon.avif",
      id: "ZzcbU68jQArT0563",
    },
    x_position: 647,
    y_position: 2763,
    z_position: 0.3,
    width: 361,
    opacity: 0.5,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1170, height: 780 },
      url: "/assets/hero/juju.avif",
      id: "Zzcbs68jQArT057H",
    },
    x_position: 901,
    y_position: 2548,
    z_position: 0,
    width: 274,
    opacity: 0.6,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/guts.avif",
      id: "ZzccC68jQArT057q",
    },
    x_position: 2779,
    y_position: 1320,
    z_position: 0,
    width: 120,
    opacity: 0.3,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 675, height: 1200 },
      url: "/assets/hero/tonytony.avif",
      id: "ZzccW68jQArT0573",
    },
    x_position: 2935,
    y_position: 1725,
    z_position: 0,
    width: 89,
    opacity: 0.3,
    project: {
      id: "ZzcSSRAAACcA5JtJ",
      data: {
        title: "KITE MAN HELL YEAH!",
        description:
          "Praised as one of the top ten new shows in 2024 by Rolling Stone, the series follows the saucy adventures of Kite Man and his girlfriend Golden Glider who live together in Noonan's, Gotham's seediest dive bar.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 770, height: 1080 },
      url: "/assets/hero/guardians.avif",
      id: "Z6SbqZbqstJ9-Sw9",
    },
    x_position: 5128,
    y_position: 98,
    z_position: 0,
    width: 169,
    opacity: 1,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 637, height: 920 },
      url: "/assets/hero/ihavenoenemies.avif",
      id: "ZzcdLq8jQArT0588",
    },
    x_position: 5113,
    y_position: 246,
    z_position: 0.4,
    width: 361,
    opacity: 0.8,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/ippo.avif",
      id: "Z6SY3pbqstJ9-Stg",
    },
    x_position: 5345,
    y_position: 2876,
    z_position: 0,
    width: 350,
    opacity: 1,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 768, height: 1376 },
      url: "/assets/hero/AE86.avif", //try
      id: "Z6SaDpbqstJ9-Svl",
    },
    x_position: 4688,
    y_position: 2731,
    z_position: 0,
    width: 323,
    opacity: 1,
    project: {
      id: "ZzcSJhAAACYA5Jr5",
      data: {
        title: "JUSTICE LEAGUE WARWORLD",
        description:
          "For\nJustice League: Warworld\n, Michael relished\nthe opportunity to score these iconic\ncharacters in bold and unexpected ways,\nshaping a musical odyssey that reflected the\nfilm’s genre-hopping adventure.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1010, height: 1200 },
      url: "/assets/hero/blackclover.avif",
      id: "Zzdhi68jQArT0645",
    },
    x_position: 907,
    y_position: 1880,
    z_position: 0,
    width: 101,
    opacity: 0.6,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/dante.avif",
      id: "Z6SoUJbqstJ9-S3z",
    },
    x_position: 1186,
    y_position: 572,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "ZzcSSRAAACcA5JtJ",
      data: {
        title: "KITE MAN HELL YEAH!",
        description:
          "Praised as one of the top ten new shows in 2024 by Rolling Stone, the series follows the saucy adventures of Kite Man and his girlfriend Golden Glider who live together in Noonan's, Gotham's seediest dive bar.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 735, height: 1043 },
      url: "/assets/hero/aoi.avif",
      id: "Zzdhja8jQArT0647",
    },
    x_position: 90,
    y_position: 195,
    z_position: 0.1,
    width: 311,
    opacity: 0.3,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1192, height: 682 },
      url: "/assets/hero/shadowatomic.avif",
      id: "Zzdhiq8jQArT0644",
    },
    x_position: 634,
    y_position: 1341,
    z_position: 0,
    width: 596,
    opacity: 0.5,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1152, height: 2048 },
      url: "/assets/hero/wingsoffreedom.avif",
      id: "Zzdi3q8jQArT066L",
    },
    x_position: 5100,
    y_position: 357,
    z_position: 0,
    width: 89,
    opacity: 0.5,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 828, height: 435 },
      url: "/assets/hero/hishintai.avif",
      id: "Zzdhia8jQArT0643",
    },
    x_position: 786,
    y_position: 274,
    z_position: 0,
    width: 248,
    opacity: 0.3,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 496, height: 618 },
      url: "/assets/hero/acebattery.avif",
      id: "Zzdhia8jQArT0642",
    },
    x_position: 972,
    y_position: 6,
    z_position: 0.1,
    width: 248,
    opacity: 0.4,
    project: {
      id: "ZzcSJhAAACYA5Jr5",
      data: {
        title: "JUSTICE LEAGUE WARWORLD",
        description:
          "For\nJustice League: Warworld\n, Michael relished\nthe opportunity to score these iconic\ncharacters in bold and unexpected ways,\nshaping a musical odyssey that reflected the\nfilm’s genre-hopping adventure.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1257 },
      url: "/assets/hero/tothemoon.avif",
      id: "Zzdr-a8jQArT07Df",
    },
    x_position: 2071,
    y_position: 279,
    z_position: 0,
    width: 128,
    opacity: 0.4,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/dmc.avif",
      id: "Zzdr-K8jQArT07De",
    },
    x_position: 1766,
    y_position: 361,
    z_position: 0.1,
    width: 380,
    opacity: 0.4,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1096, height: 1892 },
      url: "/assets/hero/hangelevi.avif",
      id: "Zzdr-q8jQArT07Dg",
    },
    x_position: 1381,
    y_position: 1100,
    z_position: 0,
    width: 147,
    opacity: 0.5,
    project: {
      id: "ZzcSSRAAACcA5JtJ",
      data: {
        title: "KITE MAN HELL YEAH!",
        description:
          "Praised as one of the top ten new shows in 2024 by Rolling Stone, the series follows the saucy adventures of Kite Man and his girlfriend Golden Glider who live together in Noonan's, Gotham's seediest dive bar.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 627, height: 1114 },
      url: "/assets/hero/gabi.avif",
      id: "Zzdr-68jQArT07Dh",
    },
    x_position: 3621,
    y_position: 520,
    z_position: 0,
    width: 90,
    opacity: 0.3,
    project: {
      id: "ZzcSJhAAACYA5Jr5",
      data: {
        title: "JUSTICE LEAGUE WARWORLD",
        description:
          "For\nJustice League: Warworld\n, Michael relished\nthe opportunity to score these iconic\ncharacters in bold and unexpected ways,\nshaping a musical odyssey that reflected the\nfilm’s genre-hopping adventure.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1292 },
      url: "/assets/hero/igris.avif",
      id: "Zzdr9q8jQArT07Dc",
    },
    x_position: 1397,
    y_position: 1791,
    z_position: 0.1,
    width: 166,
    opacity: 0.4,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 368, height: 448 },
      url: "/assets/hero/luffyimstillweak.avif",
      id: "Zzdr_K8jQArT07Di",
    },
    x_position: 1529,
    y_position: 2510,
    z_position: 0,
    width: 183,
    opacity: 0.3,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 735, height: 414 },
      url: "/assets/hero/blades.avif",
      id: "ZzduvK8jQArT07Fv",
    },
    x_position: 1897,
    y_position: 951,
    z_position: 0,
    width: 303,
    opacity: 1,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 617, height: 752 },
      url: "/assets/hero/depresseddeku.avif",
      id: "ZzdvKa8jQArT07GF",
    },
    x_position: 2046,
    y_position: 1060,
    z_position: 0.3,
    width: 309,
    opacity: 0.5,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 641, height: 741 },
      url: "/assets/hero/knowpain.avif",
      id: "Zzduu68jQArT07Fu",
    },
    x_position: 1842,
    y_position: 1314,
    z_position: 0.1,
    width: 320,
    opacity: 0.6,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 202, height: 246 },
      url: "/assets/hero/judgementchain.avif",
      id: "Zzduvq8jQArT07Fx",
    },
    x_position: 1716,
    y_position: 1860,
    z_position: 0,
    width: 101,
    opacity: 0.5,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 617, height: 751 },
      url: "/assets/hero/chrollo.avif",
      id: "Zzduuq8jQArT07Ft",
    },
    x_position: 1809,
    y_position: 1915,
    z_position: 0.1,
    width: 308,
    opacity: 0.5,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/7.avif",
      id: "ZzduwK8jQArT07Fz",
    },
    x_position: 1086,
    y_position: 2102,
    z_position: 0.1,
    width: 199,
    opacity: 0.4,
    project: {
      id: "ZzcSMxAAACYA5JsU",
      data: {
        title: "SHARK WEEK",
        description:
          "As Michael transitioned from scoring commercials to long-form film and television, one of his first major projects was a documentary for Discovery Channel’s SHARK WEEK.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 678, height: 847 },
      url: "/assets/hero/gon.avif",
      id: "Zzduua8jQArT07Fr",
    },
    x_position: 1562,
    y_position: 2873,
    z_position: -0.02,
    width: 319,
    opacity: 0.4,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1432 },
      url: "/assets/hero/tanjiroinfinity.avif",
      id: "Zzduwa8jQArT07F0",
    },
    x_position: 2067,
    y_position: 2218,
    z_position: 0.2,
    width: 266,
    opacity: 0.5,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1179, height: 2556 },
      url: "/assets/hero/gokuuu.avif",
      id: "Zzduva8jQArT07Fw",
    },
    x_position: 2247,
    y_position: 1993,
    z_position: 0,
    width: 147,
    opacity: 0.5,
    project: {
      id: "ZzcSGRAAACUA5Jre",
      data: {
        title: "TEEN TITANS DC SUPER HERO GIRLS",
        description:
          "Michael spent three exciting seasons creating the music for the DC Super Hero Girls\nseries reboot. Across 78 episodes, he developed signature sounds and themes for over 50 characters from the DC Universe.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1219 },
      url: "/assets/hero/uraharaichigo.avif", //next to paincol
      id: "Zzduv68jQArT07Fy",
    },
    x_position: 2099,
    y_position: 1578,
    z_position: 0,
    width: 147,
    opacity: 1,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1080, height: 2400 },
      url: "/assets/hero/cowboybebop.avif",
      id: "ZzdxyK8jQArT07Hy",
    },
    x_position: 1554,
    y_position: 51,
    z_position: 0.1,
    width: 178,
    opacity: 0.5,
    project: {
      id: "ZzcSMxAAACYA5JsU",
      data: {
        title: "SHARK WEEK",
        description:
          "As Michael transitioned from scoring commercials to long-form film and television, one of his first major projects was a documentary for Discovery Channel’s SHARK WEEK.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 675 },
      url: "/assets/hero/ichigosroom.avif",
      id: "Zzdxx68jQArT07Hx",
    },
    x_position: 2439,
    y_position: 145,
    z_position: 0,
    width: 551,
    opacity: 0.6,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 675 },
      url: "/assets/hero/tokyoghoul.avif", //BOB mid up
      id: "Zzdxxq8jQArT07Hw",
    },
    x_position: 2386,
    y_position: 783,
    z_position: 0.2,
    width: 245,
    opacity: 0.5,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1308, height: 736 },
      url: "/assets/hero/ryo.avif", // above 86
      id: "Zzdxya8jQArT07Hz",
    },
    x_position: 2588,
    y_position: 1014,
    z_position: 0,
    width: 169,
    opacity: 0.5,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 179, height: 218 },
      url: "/assets/hero/86bot.avif",
      id: "Zzdxy68jQArT07H1",
    },
    x_position: 2629,
    y_position: 1101,
    z_position: 0.2,
    width: 89,
    opacity: 1,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1470, height: 1468 },
      url: "/assets/hero/johan.avif",
      id: "Zzdxzq8jQArT07H4",
    },
    x_position: 2480,
    y_position: 1180,
    z_position: 0.1,
    width: 166,
    opacity: 0.3,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1920, height: 1080 },
      url: "/assets/hero/luffywalk.avif", //center
      id: "Zzdxz68jQArT07H5",
    },
    x_position: 2149,
    y_position: 1281,
    z_position: 0,
    width: 410,
    opacity: 1,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 2120 },
      url: "/assets/hero/akira.avif",
      id: "Zzdxyq8jQArT07H0",
    },
    x_position: 2499,
    y_position: 1806,
    z_position: 0,
    width: 89,
    opacity: 0.3,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1897, height: 1016 },
      url: "/assets/hero/tempest.avif",
      id: "Zzdxza8jQArT07H3",
    },
    x_position: 2558,
    y_position: 2149,
    z_position: 0,
    width: 299,
    opacity: 0.8,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/higuruma.avif",
      id: "Zzdx0K8jQArT07H6",
    },
    x_position: 2367,
    y_position: 2804,
    z_position: 0,
    width: 318,
    opacity: 0.3,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1308, height: 736 },
      url: "/assets/hero/starkfish.avif",
      id: "Zzd0G68jQArT07JM",
    },
    x_position: 2987,
    y_position: 2670,
    z_position: 0,
    width: 352,
    opacity: 0.9,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 666 },
      url: "/assets/hero/wistoria.avif",
      id: "Zzd0HK8jQArT07JN",
    },
    x_position: 2798,
    y_position: 2372,
    z_position: 0.1,
    width: 300,
    opacity: 0.7,
    project: {
      id: "ZzcSSRAAACcA5JtJ",
      data: {
        title: "KITE MAN HELL YEAH!",
        description:
          "Praised as one of the top ten new shows in 2024 by Rolling Stone, the series follows the saucy adventures of Kite Man and his girlfriend Golden Glider who live together in Noonan's, Gotham's seediest dive bar.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 886, height: 1279 },
      url: "/assets/hero/gintama.avif",
      id: "Zzd0F68jQArT07JI",
    },
    x_position: 2732,
    y_position: 1967,
    z_position: 0.1,
    width: 166,
    opacity: 0.8,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 395, height: 481 },
      url: "/assets/hero/rudo.avif",
      id: "Z6SucpbqstJ9-S-C",
    },
    x_position: 3114,
    y_position: 1117,
    z_position: 0.1,
    width: 197,
    opacity: 1,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/cbcrew.avif",
      id: "Zzd0GK8jQArT07JJ",
    },
    x_position: 3039,
    y_position: 1087,
    z_position: 0,
    width: 101,
    opacity: 0.8,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1002, height: 564 },
      url: "/assets/hero/slime.avif",
      id: "Z6SndJbqstJ9-S3h",
    },
    x_position: 2904,
    y_position: 628,
    z_position: 0,
    width: 364,
    opacity: 0.8,
    project: {
      id: "ZzcSJhAAACYA5Jr5",
      data: {
        title: "JUSTICE LEAGUE WARWORLD",
        description:
          "For\nJustice League: Warworld\n, Michael relished\nthe opportunity to score these iconic\ncharacters in bold and unexpected ways,\nshaping a musical odyssey that reflected the\nfilm’s genre-hopping adventure.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 460 },
      url: "/assets/hero/iposendo.avif",
      id: "Zzd2ia8jQArT07KX",
    },
    x_position: 3701,
    y_position: 95,
    z_position: 0.1,
    width: 368,
    opacity: 0.5,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 675 },
      url: "/assets/hero/ryoabel.avif",
      id: "Zzd2iK8jQArT07KW",
    },
    x_position: 3680,
    y_position: 951,
    z_position: 0,
    width: 270,
    opacity: 0.7,
    project: {
      id: "ZzcSMxAAACYA5JsU",
      data: {
        title: "SHARK WEEK",
        description:
          "As Michael transitioned from scoring commercials to long-form film and television, one of his first major projects was a documentary for Discovery Channel’s SHARK WEEK.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 700, height: 1000 },
      url: "/assets/hero/blacklagoon.avif",
      id: "Zzd2jK8jQArT07Ka",
    },
    x_position: 3353,
    y_position: 1014,
    z_position: 0.5,
    width: 169,
    opacity: 1,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1234, height: 727 },
      url: "/assets/hero/thorsdnd.avif",
      id: "Zzd2i68jQArT07KZ",
    },
    x_position: 3464,
    y_position: 1103,
    z_position: 1,
    width: 361,
    opacity: 0.3,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 179, height: 218 },
      url: "/assets/hero/5leafclover.avif",
      id: "Zzd2j68jQArT07Kd",
    },
    x_position: 3394,
    y_position: 1201,
    z_position: 0,
    width: 89,
    opacity: 1,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/seven13.avif",
      id: "Zzd2ka8jQArT07Kf",
    },
    x_position: 3333,
    y_position: 1513,
    z_position: 0,
    width: 251,
    opacity: 0.8,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 779, height: 720 },
      url: "/assets/hero/luffyjolly.avif",
      id: "Zzd2ja8jQArT07Kb",
    },
    x_position: 3477,
    y_position: 1693,
    z_position: 0.1,
    width: 89,
    opacity: 0.4,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 202, height: 246 },
      url: "/assets/hero/spikefaye.avif",
      id: "Zzd2kK8jQArT07Ke",
    },
    x_position: 3353,
    y_position: 1878,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "ZzcSGRAAACUA5Jre",
      data: {
        title: "TEEN TITANS DC SUPER HERO GIRLS",
        description:
          "Michael spent three exciting seasons creating the music for the DC Super Hero Girls\nseries reboot. Across 78 episodes, he developed signature sounds and themes for over 50 characters from the DC Universe.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/stampede.avif",
      id: "Zzd2iq8jQArT07KY",
    },
    x_position: 3394,
    y_position: 1941,
    z_position: 0.1,
    width: 317,
    opacity: 0.5,
    project: {
      id: "ZzcSSRAAACcA5JtJ",
      data: {
        title: "KITE MAN HELL YEAH!",
        description:
          "Praised as one of the top ten new shows in 2024 by Rolling Stone, the series follows the saucy adventures of Kite Man and his girlfriend Golden Glider who live together in Noonan's, Gotham's seediest dive bar.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 218, height: 264 },
      url: "/assets/hero/nothinghappened.avif",
      id: "Zzd2kq8jQArT07Kg",
    },
    x_position: 3517,
    y_position: 2581,
    z_position: 0,
    width: 109,
    opacity: 0.2,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 720, height: 1280 },
      url: "/assets/hero/vash.avif",
      id: "Zzd2h68jQArT07KU",
    },
    x_position: 4775,
    y_position: 587,
    z_position: 0,
    width: 119,
    opacity: 0.8,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 394, height: 480 },
      url: "/assets/hero/climber.avif", //clear
      id: "Zzd2jq8jQArT07Kc",
    },
    x_position: 4028,
    y_position: 1875,
    z_position: 0,
    width: 197,
    opacity: 0.8,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 395, height: 431 },
      url: "/assets/hero/knowpainbw.avif", //teen titans
      id: "Z6ScgZbqstJ9-SxZ",
    },
    x_position: 4469,
    y_position: 220,
    z_position: 0,
    width: 197,
    opacity: 1,
    project: {
      id: "ZzcSGRAAACUA5Jre",
      data: {
        title: "TEEN TITANS DC SUPER HERO GIRLS",
        description:
          "Michael spent three exciting seasons creating the music for the DC Super Hero Girls\nseries reboot. Across 78 episodes, he developed signature sounds and themes for over 50 characters from the DC Universe.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 828, height: 1792 },
      url: "/assets/hero/spikeposter.avif",
      id: "Zzd7Mq8jQArT07NW",
    },
    x_position: 4069,
    y_position: 611,
    z_position: 0.3,
    width: 258,
    opacity: 1,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 688, height: 1318 },
      url: "/assets/hero/shoyohinata.avif",
      id: "Zzd7La8jQArT07NQ",
    },
    x_position: 4298,
    y_position: 924,
    z_position: 0,
    width: 110,
    opacity: 0.9,
    project: {
      id: "ZzcSMxAAACYA5JsU",
      data: {
        title: "SHARK WEEK",
        description:
          "As Michael transitioned from scoring commercials to long-form film and television, one of his first major projects was a documentary for Discovery Channel’s SHARK WEEK.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/mikasa.avif",
      id: "Zzd7LK8jQArT07NP",
    },
    x_position: 4512,
    y_position: 1416,
    z_position: 0,
    width: 269,
    opacity: 0.4,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 1800 },
      url: "/assets/hero/daemons.avif",
      id: "Zzd7M68jQArT07NX",
    },
    x_position: 4097,
    y_position: 1621,
    z_position: 0.1,
    width: 318,
    opacity: 0.4,
    project: {
      id: "ZzcSJhAAACYA5Jr5",
      data: {
        title: "JUSTICE LEAGUE WARWORLD",
        description:
          "For\nJustice League: Warworld\n, Michael relished\nthe opportunity to score these iconic\ncharacters in bold and unexpected ways,\nshaping a musical odyssey that reflected the\nfilm’s genre-hopping adventure.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 302, height: 366 },
      url: "/assets/hero/senkueinstein.avif",
      id: "Zzd7Lq8jQArT07NR",
    },
    x_position: 4256,
    y_position: 2325,
    z_position: 0,
    width: 151,
    opacity: 1,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/spikedoor.avif",
      id: "Zzd7K68jQArT07NO",
    },
    x_position: 3991,
    y_position: 2416,
    z_position: 0.1,
    width: 340,
    opacity: 0.5,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 764, height: 1200 },
      url: "/assets/hero/musashi.avif",
      id: "Z6Spc5bqstJ9-S4V",
    },
    x_position: 2310,
    y_position: 691,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "ZzcSSRAAACcA5JtJ",
      data: {
        title: "KITE MAN HELL YEAH!",
        description:
          "Praised as one of the top ten new shows in 2024 by Rolling Stone, the series follows the saucy adventures of Kite Man and his girlfriend Golden Glider who live together in Noonan's, Gotham's seediest dive bar.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 720, height: 1261 },
      url: "/assets/hero/boomjump.avif",
      id: "Z6ScB5bqstJ9-SxN",
    },
    x_position: 3225,
    y_position: 210,
    z_position: 0.1,
    width: 300,
    opacity: 1,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1199, height: 676 },
      url: "/assets/hero/kenshin.avif", //clear bruce
      id: "Zzd9vq8jQArT07PC",
    },
    x_position: 5064,
    y_position: 635,
    z_position: 0,
    width: 251,
    opacity: 0.7,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1309 },
      url: "/assets/hero/homunculus.avif",
      id: "Zzd9uq8jQArT07O9",
    },
    x_position: 4585,
    y_position: 952,
    z_position: 0,
    width: 212,
    opacity: 0.4,
    project: {
      id: "ZzcSGRAAACUA5Jre",
      data: {
        title: "TEEN TITANS DC SUPER HERO GIRLS",
        description:
          "Michael spent three exciting seasons creating the music for the DC Super Hero Girls\nseries reboot. Across 78 episodes, he developed signature sounds and themes for over 50 characters from the DC Universe.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1178 },
      url: "/assets/hero/rabbit.avif",
      id: "Zzd9ta8jQArT07O3",
    },
    x_position: 5041,
    y_position: 1289,
    z_position: 0,
    width: 274,
    opacity: 1,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 678, height: 662 },
      url: "/assets/hero/hisoka.avif", //far right mid
      id: "Zzd9ta8jQArT07O4",
    },
    x_position: 5421,
    y_position: 1264,
    z_position: 0.5,
    width: 338,
    opacity: 1,
    project: {
      id: "ZzcSJRAAACcA5Jr1",
      data: {
        title: "Blood Drive",
        description:
          "Blood Drive, what a ride!  A dystopian anthology wherein each episode paid homage to a different genre of grind house cinema with the score following suit.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 460 },
      url: "/assets/hero/sevenvhua.avif",
      id: "Zzd9u68jQArT07O_",
    },
    x_position: 5288,
    y_position: 895,
    z_position: 0,
    width: 303,
    opacity: 0.6,
    project: {
      id: "ZzcSPhAAACcA5Jst",
      data: {
        title: "ILLUMINATION",
        description:
          "Michael has scored multiple projects for Universal/Illumination featuring characters from Minions, The Secret Life of Pets, SING!, and Despicable Me films as well as music for the Minions Mayhem Ride at Universal Studios Japan.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 724, height: 881 },
      url: "/assets/hero/drifters.avif", //mask
      id: "Zzd9t68jQArT07O6",
    },
    x_position: 5205,
    y_position: 1563,
    z_position: 0.3,
    width: 361,
    opacity: 1,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1199, height: 676 },
      url: "/assets/hero/shangrila.avif",
      id: "Zzd9uK8jQArT07O7",
    },
    x_position: 4879,
    y_position: 1955,
    z_position: 0,
    width: 369,
    opacity: 1,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 1693 },
      url: "/assets/hero/aoashi.avif",
      id: "Zzd9tq8jQArT07O5",
    },
    x_position: 5386,
    y_position: 2106,
    z_position: 0,
    width: 525,
    opacity: 0.7,
    project: {
      id: "ZzBpIhAAACcA2lFZ",
      data: {
        title: "Braid",
        description:
          "Braid\nis a surreal psychological horror thriller starring\nMadeline Brewer (The Handmaid’s Tale, Cam, Orange Is the New Black).",
      },
    },
  },
  {
    image: {
      dimensions: { width: 179, height: 218 },
      url: "/assets/hero/gonrage.avif",
      id: "Zzd9vK8jQArT07PA",
    },
    x_position: 4790,
    y_position: 2460,
    z_position: 0,
    width: 89,
    opacity: 0.3,
    project: {
      id: "ZzcSJhAAACYA5Jr5",
      data: {
        title: "JUSTICE LEAGUE WARWORLD",
        description:
          "For\nJustice League: Warworld\n, Michael relished\nthe opportunity to score these iconic\ncharacters in bold and unexpected ways,\nshaping a musical odyssey that reflected the\nfilm’s genre-hopping adventure.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/akira2.avif",
      id: "Zzd9va8jQArT07PB",
    },
    x_position: 5023,
    y_position: 2621,
    z_position: 0,
    width: 166,
    opacity: 0.4,
    project: {
      id: "ZzcSGRAAACUA5Jre",
      data: {
        title: "TEEN TITANS DC SUPER HERO GIRLS",
        description:
          "Michael spent three exciting seasons creating the music for the DC Super Hero Girls\nseries reboot. Across 78 episodes, he developed signature sounds and themes for over 50 characters from the DC Universe.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 676, height: 1200 },
      url: "/assets/hero/ashito33.avif",
      id: "Zzd9ua8jQArT07O8",
    },
    x_position: 981.06,
    y_position: 1461.18,
    z_position: 0.3,
    width: 161,
    opacity: 0.4,
    project: {
      id: "ZzcSChAAACQA5JrC",
      data: {
        title: "Batman:The Long Halloween",
        description:
          "As a lifelong Batman fan, Michael was thrilled to score The Long Halloween, one of the most iconic stories in the Dark Knight’s canon.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1472, height: 828 },
      url: "/assets/hero/cyberpunk.avif",
      id: "Z6N4rpbqstJ9-Qd9",
    },
    x_position: 4700,
    y_position: 1850,
    z_position: 0.4,
    width: 450,
    opacity: 0.5,
    project: {
      id: "ZzBpQhAAACUA2lGK",
      data: {
        title: "DUNGEONS & DRAGONS",
        description:
          "A lifelong Dungeons & Dragons player and fan, Michael was entrusted by Wizards of the Coast to create signature sounds and themes for iconic characters, lands and factions within the legendary Forgotten Realms.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1080, height: 1775 },
      url: "/assets/hero/eijunmiyuki.avif", // dnd tony
      id: "Z5oXoZbqstJ99_KL",
    },
    x_position: 2680,
    y_position: 1652,
    z_position: 0.1,
    width: 150,
    opacity: 0.6,
    project: {
      id: "ZzBpQhAAACUA2lGK",
      data: {
        title: "DUNGEONS & DRAGONS",
        description:
          "A lifelong Dungeons & Dragons player and fan, Michael was entrusted by Wizards of the Coast to create signature sounds and themes for iconic characters, lands and factions within the legendary Forgotten Realms.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 886 },
      url: "/assets/hero/jjk.avif",
      id: "Z5DVB5bqstJ99upA",
    },
    x_position: 1420,
    y_position: 1350,
    z_position: 0,
    width: 250,
    opacity: 1,
    project: {
      id: "ZzBpQhAAACUA2lGK",
      data: {
        title: "DUNGEONS & DRAGONS",
        description:
          "A lifelong Dungeons & Dragons player and fan, Michael was entrusted by Wizards of the Coast to create signature sounds and themes for iconic characters, lands and factions within the legendary Forgotten Realms.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1800, height: 1798 },
      url: "/assets/hero/levi.avif",
      id: "Z5oXoZbqstJ99_KL",
    },
    x_position: 850,
    y_position: 700,
    z_position: 0.2,
    width: 400,
    opacity: 0.45,
    project: {
      id: "ZzBpQhAAACUA2lGK",
      data: {
        title: "DUNGEONS & DRAGONS",
        description:
          "A lifelong Dungeons & Dragons player and fan, Michael was entrusted by Wizards of the Coast to create signature sounds and themes for iconic characters, lands and factions within the legendary Forgotten Realms.",
      },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 675 },
      url: "/assets/hero/mustangfmab.avif",
      id: "ZzBqu68jQArT0qMF",
    },
    x_position: 3400,
    y_position: 2950,
    z_position: 0.3,
    width: 450,
    opacity: 0.35,
    project: {
      id: "ZzBpQhAAACUA2lGK",
      data: {
        title: "DUNGEONS & DRAGONS",
        description:
          "A lifelong Dungeons & Dragons player and fan, Michael was entrusted by Wizards of the Coast to create signature sounds and themes for iconic characters, lands and factions within the legendary Forgotten Realms.",
      },
    },
  },
];
