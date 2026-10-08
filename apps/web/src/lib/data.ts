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
  id: string;
  calcWidth: number;
  calcHeight: number;
  xPos: number;
  yPos: number;
  zPos: number;
  baseOpacity: number;
}

const defaultDesc = "Featured gallery artwork in the Animanga void.";

export const projectsData: ProjectData[] = [
  {
    image: {
      dimensions: { width: 736, height: 1144 },
      url: "/assets/hero/makizenin.avif",
      id: "img-01",
    },
    x_position: -123,
    y_position: 2063,
    z_position: 0,
    width: 318,
    opacity: 1,
    project: {
      id: "animanga-gallery-01",
      data: { title: "Maki Zenin", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1770, height: 800 },
      url: "/assets/hero/mustangenvy.avif",
      id: "img-02",
    },
    x_position: 363,
    y_position: 818,
    z_position: 0.1,
    width: 376,
    opacity: 1,
    project: {
      id: "animanga-gallery-02",
      data: { title: "Roy Mustang", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/vagabond.avif",
      id: "img-03",
    },
    x_position: 746,
    y_position: 742,
    z_position: 0,
    width: 120,
    opacity: 1,
    project: {
      id: "animanga-gallery-03",
      data: { title: "Vagabond", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 675, height: 1200 },
      url: "/assets/hero/spikecrewpot.avif",
      id: "img-04",
    },
    x_position: 546,
    y_position: 242,
    z_position: 0,
    width: 109,
    opacity: 1,
    project: {
      id: "animanga-gallery-04",
      data: { title: "Cowboy Bebop Crew", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 675, height: 1200 },
      url: "/assets/hero/haikyuu.avif",
      id: "img-05",
    },
    x_position: 224,
    y_position: 1341,
    z_position: 0,
    width: 166,
    opacity: 1,
    project: {
      id: "animanga-gallery-05",
      data: { title: "Haikyuu!!", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 720, height: 720 },
      url: "/assets/hero/sevenbo.avif",
      id: "img-06",
    },
    x_position: 1447,
    y_position: 783,
    z_position: 0.2,
    width: 266,
    opacity: 1,
    project: {
      id: "animanga-gallery-06",
      data: { title: "Seven Deadly Sins", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 251, height: 305 },
      url: "/assets/hero/drstoneposter.avif",
      id: "img-07",
    },
    x_position: 525,
    y_position: 1864,
    z_position: 0,
    width: 125,
    opacity: 1,
    project: {
      id: "animanga-gallery-07",
      data: { title: "Dr. Stone", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1198, height: 674 },
      url: "/assets/hero/thorfinvthorkell.avif",
      id: "img-08",
    },
    x_position: 537,
    y_position: 2116,
    z_position: 0,
    width: 343,
    opacity: 1,
    project: {
      id: "animanga-gallery-08",
      data: { title: "Thorfinn vs Thorkell", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 720, height: 720 },
      url: "/assets/hero/seven.avif",
      id: "img-09",
    },
    x_position: 143,
    y_position: 1798,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "animanga-gallery-09",
      data: { title: "Seven", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/x.avif",
      id: "img-10",
    },
    x_position: 172,
    y_position: 2703,
    z_position: 0,
    width: 351,
    opacity: 1,
    project: {
      id: "animanga-gallery-10",
      data: { title: "X", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/sunrakuvwethermon.avif",
      id: "img-11",
    },
    x_position: 647,
    y_position: 2763,
    z_position: 0.3,
    width: 361,
    opacity: 1,
    project: {
      id: "animanga-gallery-11",
      data: { title: "Sunraku vs Wethermon", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1170, height: 780 },
      url: "/assets/hero/juju.avif",
      id: "img-12",
    },
    x_position: 901,
    y_position: 2548,
    z_position: 0,
    width: 274,
    opacity: 1,
    project: {
      id: "animanga-gallery-12",
      data: { title: "Jujutsu Kaisen", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/guts.avif",
      id: "img-13",
    },
    x_position: 2779,
    y_position: 1320,
    z_position: 0,
    width: 120,
    opacity: 1,
    project: {
      id: "animanga-gallery-13",
      data: { title: "Guts", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 675, height: 1200 },
      url: "/assets/hero/tonytony.avif",
      id: "img-14",
    },
    x_position: 2935,
    y_position: 1725,
    z_position: 0,
    width: 89,
    opacity: 1,
    project: {
      id: "animanga-gallery-14",
      data: { title: "Tony Tony Chopper", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 770, height: 1080 },
      url: "/assets/hero/guardians.avif",
      id: "img-15",
    },
    x_position: 5128,
    y_position: 98,
    z_position: 0,
    width: 169,
    opacity: 1,
    project: {
      id: "animanga-gallery-15",
      data: { title: "Guardians", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 637, height: 920 },
      url: "/assets/hero/ihavenoenemies.avif",
      id: "img-16",
    },
    x_position: 5113,
    y_position: 246,
    z_position: 0.4,
    width: 361,
    opacity: 1,
    project: {
      id: "animanga-gallery-16",
      data: { title: "I Have No Enemies", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/ippo.avif",
      id: "img-17",
    },
    x_position: 5345,
    y_position: 2876,
    z_position: 0,
    width: 350,
    opacity: 1,
    project: {
      id: "animanga-gallery-17",
      data: { title: "Hajime no Ippo", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 768, height: 1376 },
      url: "/assets/hero/AE86.avif",
      id: "img-18",
    },
    x_position: 4688,
    y_position: 2731,
    z_position: 0,
    width: 323,
    opacity: 1,
    project: {
      id: "animanga-gallery-18",
      data: { title: "AE86 Trueno", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1010, height: 1200 },
      url: "/assets/hero/blackclover.avif",
      id: "img-19",
    },
    x_position: 907,
    y_position: 1880,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "animanga-gallery-19",
      data: { title: "Black Clover", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/dante.avif",
      id: "img-20",
    },
    x_position: 1186,
    y_position: 572,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "animanga-gallery-20",
      data: { title: "Dante", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 735, height: 1043 },
      url: "/assets/hero/aoi.avif",
      id: "img-21",
    },
    x_position: 90,
    y_position: 195,
    z_position: 0.1,
    width: 311,
    opacity: 1,
    project: {
      id: "animanga-gallery-21",
      data: { title: "Ao Ashi", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1192, height: 682 },
      url: "/assets/hero/shadowatomic.avif",
      id: "img-22",
    },
    x_position: 634,
    y_position: 1341,
    z_position: 0,
    width: 596,
    opacity: 1,
    project: {
      id: "animanga-gallery-22",
      data: { title: "The Eminence in Shadow", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1152, height: 2048 },
      url: "/assets/hero/wingsoffreedom.avif",
      id: "img-23",
    },
    x_position: 5100,
    y_position: 357,
    z_position: 0,
    width: 89,
    opacity: 1,
    project: {
      id: "animanga-gallery-23",
      data: { title: "Wings of Freedom", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 828, height: 435 },
      url: "/assets/hero/hishintai.avif",
      id: "img-24",
    },
    x_position: 786,
    y_position: 274,
    z_position: 0,
    width: 248,
    opacity: 1,
    project: {
      id: "animanga-gallery-24",
      data: { title: "Hi Shin Unit", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 496, height: 618 },
      url: "/assets/hero/acebattery.avif",
      id: "img-25",
    },
    x_position: 972,
    y_position: 6,
    z_position: 0.1,
    width: 248,
    opacity: 1,
    project: {
      id: "animanga-gallery-25",
      data: { title: "Ace Battery", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1257 },
      url: "/assets/hero/tothemoon.avif",
      id: "img-26",
    },
    x_position: 2071,
    y_position: 279,
    z_position: 0,
    width: 128,
    opacity: 1,
    project: {
      id: "animanga-gallery-26",
      data: { title: "To The Moon", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/dmc.avif",
      id: "img-27",
    },
    x_position: 1766,
    y_position: 361,
    z_position: 0.1,
    width: 380,
    opacity: 1,
    project: {
      id: "animanga-gallery-27",
      data: { title: "Devil May Cry", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1096, height: 1892 },
      url: "/assets/hero/hangelevi.avif",
      id: "img-28",
    },
    x_position: 1381,
    y_position: 1100,
    z_position: 0,
    width: 147,
    opacity: 1,
    project: {
      id: "animanga-gallery-28",
      data: { title: "Hange & Levi", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 627, height: 1114 },
      url: "/assets/hero/gabi.avif",
      id: "img-29",
    },
    x_position: 3621,
    y_position: 520,
    z_position: 0,
    width: 90,
    opacity: 1,
    project: {
      id: "animanga-gallery-29",
      data: { title: "Gabi", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1292 },
      url: "/assets/hero/igris.avif",
      id: "img-30",
    },
    x_position: 1397,
    y_position: 1791,
    z_position: 0.1,
    width: 166,
    opacity: 1,
    project: {
      id: "animanga-gallery-30",
      data: { title: "Igris", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 368, height: 448 },
      url: "/assets/hero/luffyimstillweak.avif",
      id: "img-31",
    },
    x_position: 1529,
    y_position: 2510,
    z_position: 0,
    width: 183,
    opacity: 1,
    project: {
      id: "animanga-gallery-31",
      data: { title: "Luffy's Resolve", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 735, height: 414 },
      url: "/assets/hero/blades.avif",
      id: "img-32",
    },
    x_position: 1897,
    y_position: 951,
    z_position: 0,
    width: 303,
    opacity: 1,
    project: {
      id: "animanga-gallery-32",
      data: { title: "Blades", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 617, height: 752 },
      url: "/assets/hero/depresseddeku.avif",
      id: "img-33",
    },
    x_position: 2046,
    y_position: 1060,
    z_position: 0.3,
    width: 309,
    opacity: 1,
    project: {
      id: "animanga-gallery-33",
      data: { title: "Dark Deku", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 641, height: 741 },
      url: "/assets/hero/knowpain.avif",
      id: "img-34",
    },
    x_position: 1842,
    y_position: 1314,
    z_position: 0.1,
    width: 320,
    opacity: 1,
    project: {
      id: "animanga-gallery-34",
      data: { title: "Know Pain", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 202, height: 246 },
      url: "/assets/hero/judgementchain.avif",
      id: "img-35",
    },
    x_position: 1716,
    y_position: 1860,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "animanga-gallery-35",
      data: { title: "Judgement Chain", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 617, height: 751 },
      url: "/assets/hero/chrollo.avif",
      id: "img-36",
    },
    x_position: 1809,
    y_position: 1915,
    z_position: 0.1,
    width: 308,
    opacity: 1,
    project: {
      id: "animanga-gallery-36",
      data: { title: "Chrollo Lucilfer", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/7.avif",
      id: "img-37",
    },
    x_position: 1086,
    y_position: 2102,
    z_position: 0.1,
    width: 199,
    opacity: 1,
    project: {
      id: "animanga-gallery-37",
      data: { title: "The Seven", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 678, height: 847 },
      url: "/assets/hero/gon.avif",
      id: "img-38",
    },
    x_position: 1562,
    y_position: 2873,
    z_position: -0.02,
    width: 319,
    opacity: 1,
    project: {
      id: "animanga-gallery-38",
      data: { title: "Gon Freecss", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1432 },
      url: "/assets/hero/tanjiroinfinity.avif",
      id: "img-39",
    },
    x_position: 2067,
    y_position: 2218,
    z_position: 0.2,
    width: 266,
    opacity: 1,
    project: {
      id: "animanga-gallery-39",
      data: { title: "Infinity Castle", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1179, height: 2556 },
      url: "/assets/hero/gokuuu.avif",
      id: "img-40",
    },
    x_position: 2247,
    y_position: 1993,
    z_position: 0,
    width: 147,
    opacity: 1,
    project: {
      id: "animanga-gallery-40",
      data: { title: "Son Goku", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1219 },
      url: "/assets/hero/uraharaichigo.avif",
      id: "img-41",
    },
    x_position: 2099,
    y_position: 1578,
    z_position: 0,
    width: 147,
    opacity: 1,
    project: {
      id: "animanga-gallery-41",
      data: { title: "Urahara & Ichigo", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1080, height: 2400 },
      url: "/assets/hero/cowboybebop.avif",
      id: "img-42",
    },
    x_position: 1554,
    y_position: 51,
    z_position: 0.1,
    width: 178,
    opacity: 1,
    project: {
      id: "animanga-gallery-42",
      data: { title: "Cowboy Bebop", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 675 },
      url: "/assets/hero/ichigosroom.avif",
      id: "img-43",
    },
    x_position: 2439,
    y_position: 145,
    z_position: 0,
    width: 551,
    opacity: 1,
    project: {
      id: "animanga-gallery-43",
      data: { title: "Ichigo's Room", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 675 },
      url: "/assets/hero/tokyoghoul.avif",
      id: "img-44",
    },
    x_position: 2386,
    y_position: 783,
    z_position: 0.2,
    width: 245,
    opacity: 1,
    project: {
      id: "animanga-gallery-44",
      data: { title: "Tokyo Ghoul", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1308, height: 736 },
      url: "/assets/hero/ryo.avif",
      id: "img-45",
    },
    x_position: 2588,
    y_position: 1014,
    z_position: 0,
    width: 169,
    opacity: 1,
    project: {
      id: "animanga-gallery-45",
      data: { title: "Ryo Asuka", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 179, height: 218 },
      url: "/assets/hero/86bot.avif",
      id: "img-46",
    },
    x_position: 2629,
    y_position: 1101,
    z_position: 0.2,
    width: 89,
    opacity: 1,
    project: {
      id: "animanga-gallery-46",
      data: { title: "Juggernaut (86)", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1470, height: 1468 },
      url: "/assets/hero/johan.avif",
      id: "img-47",
    },
    x_position: 2480,
    y_position: 1180,
    z_position: 0.1,
    width: 166,
    opacity: 1,
    project: {
      id: "animanga-gallery-47",
      data: { title: "Johan Liebert", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1920, height: 1080 },
      url: "/assets/hero/luffywalk.avif",
      id: "img-48",
    },
    x_position: 2149,
    y_position: 1281,
    z_position: 0,
    width: 410,
    opacity: 1,
    project: {
      id: "animanga-gallery-48",
      data: { title: "The Walk", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 2120 },
      url: "/assets/hero/akira.avif",
      id: "img-49",
    },
    x_position: 2499,
    y_position: 1806,
    z_position: 0,
    width: 89,
    opacity: 1,
    project: {
      id: "animanga-gallery-49",
      data: { title: "Akira Poster", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1897, height: 1016 },
      url: "/assets/hero/tempest.avif",
      id: "img-50",
    },
    x_position: 2558,
    y_position: 2149,
    z_position: 0,
    width: 299,
    opacity: 1,
    project: {
      id: "animanga-gallery-50",
      data: { title: "Jura Tempest Federation", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/higuruma.avif",
      id: "img-51",
    },
    x_position: 2367,
    y_position: 2804,
    z_position: 0,
    width: 318,
    opacity: 1,
    project: {
      id: "animanga-gallery-51",
      data: { title: "Hiromi Higuruma", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1308, height: 736 },
      url: "/assets/hero/starkfish.avif",
      id: "img-52",
    },
    x_position: 2987,
    y_position: 2670,
    z_position: 0,
    width: 352,
    opacity: 1,
    project: {
      id: "animanga-gallery-52",
      data: { title: "Stark & Fish", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 666 },
      url: "/assets/hero/wistoria.avif",
      id: "img-53",
    },
    x_position: 2798,
    y_position: 2372,
    z_position: 0.1,
    width: 300,
    opacity: 1,
    project: {
      id: "animanga-gallery-53",
      data: { title: "Wistoria", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 886, height: 1279 },
      url: "/assets/hero/gintama.avif",
      id: "img-54",
    },
    x_position: 2732,
    y_position: 1967,
    z_position: 0.1,
    width: 166,
    opacity: 1,
    project: {
      id: "animanga-gallery-54",
      data: { title: "Gintama", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 395, height: 481 },
      url: "/assets/hero/rudo.avif",
      id: "img-55",
    },
    x_position: 3114,
    y_position: 1117,
    z_position: 0.1,
    width: 197,
    opacity: 1,
    project: {
      id: "animanga-gallery-55",
      data: { title: "Rudo", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/cbcrew.avif",
      id: "img-56",
    },
    x_position: 3039,
    y_position: 1087,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "animanga-gallery-56",
      data: { title: "The Bebop Crew", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1002, height: 564 },
      url: "/assets/hero/slime.avif",
      id: "img-57",
    },
    x_position: 2904,
    y_position: 628,
    z_position: 0,
    width: 364,
    opacity: 1,
    project: {
      id: "animanga-gallery-57",
      data: { title: "Rimuru Tempest", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 460 },
      url: "/assets/hero/iposendo.avif",
      id: "img-58",
    },
    x_position: 3701,
    y_position: 95,
    z_position: 0.1,
    width: 368,
    opacity: 1,
    project: {
      id: "animanga-gallery-58",
      data: { title: "Dempsey Roll", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 675 },
      url: "/assets/hero/ryoabel.avif",
      id: "img-59",
    },
    x_position: 3680,
    y_position: 951,
    z_position: 0,
    width: 270,
    opacity: 1,
    project: {
      id: "animanga-gallery-59",
      data: { title: "Ryo & Abel", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 700, height: 1000 },
      url: "/assets/hero/blacklagoon.avif",
      id: "img-60",
    },
    x_position: 3353,
    y_position: 1014,
    z_position: 0.5,
    width: 169,
    opacity: 1,
    project: {
      id: "animanga-gallery-60",
      data: { title: "Black Lagoon", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1234, height: 727 },
      url: "/assets/hero/thorsdnd.avif",
      id: "img-61",
    },
    x_position: 3464,
    y_position: 1103,
    z_position: 1,
    width: 361,
    opacity: 1,
    project: {
      id: "animanga-gallery-61",
      data: { title: "Thors", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 179, height: 218 },
      url: "/assets/hero/5leafclover.avif",
      id: "img-62",
    },
    x_position: 3394,
    y_position: 1201,
    z_position: 0,
    width: 89,
    opacity: 1,
    project: {
      id: "animanga-gallery-62",
      data: { title: "Five Leaf Grimoire", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/seven13.avif",
      id: "img-63",
    },
    x_position: 3333,
    y_position: 1513,
    z_position: 0,
    width: 251,
    opacity: 1,
    project: {
      id: "animanga-gallery-63",
      data: { title: "Scissor Seven", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 779, height: 720 },
      url: "/assets/hero/luffyjolly.avif",
      id: "img-64",
    },
    x_position: 3477,
    y_position: 1693,
    z_position: 0.1,
    width: 89,
    opacity: 1,
    project: {
      id: "animanga-gallery-64",
      data: { title: "Jolly Roger", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 202, height: 246 },
      url: "/assets/hero/spikefaye.avif",
      id: "img-65",
    },
    x_position: 3353,
    y_position: 1878,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "animanga-gallery-65",
      data: { title: "Spike & Faye", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/stampede.avif",
      id: "img-66",
    },
    x_position: 3394,
    y_position: 1941,
    z_position: 0.1,
    width: 317,
    opacity: 1,
    project: {
      id: "animanga-gallery-66",
      data: { title: "Vash the Stampede", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 218, height: 264 },
      url: "/assets/hero/nothinghappened.avif",
      id: "img-67",
    },
    x_position: 3517,
    y_position: 2581,
    z_position: 0,
    width: 109,
    opacity: 1,
    project: {
      id: "animanga-gallery-67",
      data: { title: "Nothing Happened", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 720, height: 1280 },
      url: "/assets/hero/vash.avif",
      id: "img-68",
    },
    x_position: 4775,
    y_position: 587,
    z_position: 0,
    width: 119,
    opacity: 1,
    project: {
      id: "animanga-gallery-68",
      data: { title: "Trigun", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 394, height: 480 },
      url: "/assets/hero/climber.avif",
      id: "img-69",
    },
    x_position: 4028,
    y_position: 1875,
    z_position: 0,
    width: 197,
    opacity: 1,
    project: {
      id: "animanga-gallery-69",
      data: { title: "The Climber", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 395, height: 431 },
      url: "/assets/hero/knowpainbw.avif",
      id: "img-70",
    },
    x_position: 4469,
    y_position: 220,
    z_position: 0,
    width: 197,
    opacity: 1,
    project: {
      id: "animanga-gallery-70",
      data: { title: "Pain (B&W)", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 828, height: 1792 },
      url: "/assets/hero/spikeposter.avif",
      id: "img-71",
    },
    x_position: 4069,
    y_position: 611,
    z_position: 0.3,
    width: 258,
    opacity: 1,
    project: {
      id: "animanga-gallery-71",
      data: { title: "Spike Spiegel", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 688, height: 1318 },
      url: "/assets/hero/shoyohinata.avif",
      id: "img-72",
    },
    x_position: 4298,
    y_position: 924,
    z_position: 0,
    width: 110,
    opacity: 1,
    project: {
      id: "animanga-gallery-72",
      data: { title: "Shoyo Hinata", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 414 },
      url: "/assets/hero/mikasa.avif",
      id: "img-73",
    },
    x_position: 4512,
    y_position: 1416,
    z_position: 0,
    width: 269,
    opacity: 1,
    project: {
      id: "animanga-gallery-73",
      data: { title: "Mikasa Ackerman", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 1800 },
      url: "/assets/hero/daemons.avif",
      id: "img-74",
    },
    x_position: 4097,
    y_position: 1621,
    z_position: 0.1,
    width: 318,
    opacity: 1,
    project: {
      id: "animanga-gallery-74",
      data: { title: "Daemons", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 302, height: 366 },
      url: "/assets/hero/senkueinstein.avif",
      id: "img-75",
    },
    x_position: 4256,
    y_position: 2325,
    z_position: 0,
    width: 151,
    opacity: 1,
    project: {
      id: "animanga-gallery-75",
      data: { title: "Senku & Einstein", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/spikedoor.avif",
      id: "img-76",
    },
    x_position: 3991,
    y_position: 2416,
    z_position: 0.1,
    width: 340,
    opacity: 1,
    project: {
      id: "animanga-gallery-76",
      data: { title: "See You Space Cowboy", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 764, height: 1200 },
      url: "/assets/hero/musashi.avif",
      id: "img-77",
    },
    x_position: 2310,
    y_position: 691,
    z_position: 0,
    width: 101,
    opacity: 1,
    project: {
      id: "animanga-gallery-77",
      data: { title: "Miyamoto Musashi", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 720, height: 1261 },
      url: "/assets/hero/boomjump.avif",
      id: "img-78",
    },
    x_position: 3225,
    y_position: 210,
    z_position: 0.1,
    width: 300,
    opacity: 1,
    project: {
      id: "animanga-gallery-78",
      data: { title: "Leap of Faith", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1199, height: 676 },
      url: "/assets/hero/kenshin.avif",
      id: "img-79",
    },
    x_position: 5064,
    y_position: 635,
    z_position: 0,
    width: 251,
    opacity: 1,
    project: {
      id: "animanga-gallery-79",
      data: { title: "Rurouni Kenshin", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1309 },
      url: "/assets/hero/homunculus.avif",
      id: "img-80",
    },
    x_position: 4585,
    y_position: 952,
    z_position: 0,
    width: 212,
    opacity: 1,
    project: {
      id: "animanga-gallery-80",
      data: { title: "Homunculus", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1178 },
      url: "/assets/hero/rabbit.avif",
      id: "img-81",
    },
    x_position: 5041,
    y_position: 1289,
    z_position: 0,
    width: 274,
    opacity: 1,
    project: {
      id: "animanga-gallery-81",
      data: { title: "Rabbit", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 678, height: 662 },
      url: "/assets/hero/hisoka.avif",
      id: "img-82",
    },
    x_position: 5421,
    y_position: 1264,
    z_position: 0.5,
    width: 338,
    opacity: 1,
    project: {
      id: "animanga-gallery-82",
      data: { title: "Hisoka Morow", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 460 },
      url: "/assets/hero/sevenvhua.avif",
      id: "img-83",
    },
    x_position: 5288,
    y_position: 895,
    z_position: 0,
    width: 303,
    opacity: 1,
    project: {
      id: "animanga-gallery-83",
      data: { title: "Seven vs Hua", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 724, height: 881 },
      url: "/assets/hero/drifters.avif",
      id: "img-84",
    },
    x_position: 5205,
    y_position: 1563,
    z_position: 0.3,
    width: 361,
    opacity: 1,
    project: {
      id: "animanga-gallery-84",
      data: { title: "Drifters", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1199, height: 676 },
      url: "/assets/hero/shangrila.avif",
      id: "img-85",
    },
    x_position: 4879,
    y_position: 1955,
    z_position: 0,
    width: 369,
    opacity: 1,
    project: {
      id: "animanga-gallery-85",
      data: { title: "Shangri-La Frontier", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 1693 },
      url: "/assets/hero/aoashi.avif",
      id: "img-86",
    },
    x_position: 5386,
    y_position: 2106,
    z_position: 0,
    width: 525,
    opacity: 1,
    project: {
      id: "animanga-gallery-86",
      data: { title: "Ao Ashi Playmaker", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 179, height: 218 },
      url: "/assets/hero/gonrage.avif",
      id: "img-87",
    },
    x_position: 4790,
    y_position: 2460,
    z_position: 0,
    width: 89,
    opacity: 1,
    project: {
      id: "animanga-gallery-87",
      data: { title: "Gon's Rage", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 1308 },
      url: "/assets/hero/akira2.avif",
      id: "img-88",
    },
    x_position: 5023,
    y_position: 2621,
    z_position: 0,
    width: 166,
    opacity: 1,
    project: {
      id: "animanga-gallery-88",
      data: { title: "Neo Tokyo", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 676, height: 1200 },
      url: "/assets/hero/ashito33.avif",
      id: "img-89",
    },
    x_position: 981.06,
    y_position: 1461.18,
    z_position: 0.3,
    width: 161,
    opacity: 1,
    project: {
      id: "animanga-gallery-89",
      data: { title: "Aoi Ashito #33", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1472, height: 828 },
      url: "/assets/hero/cyberpunk.avif",
      id: "img-90",
    },
    x_position: 4700,
    y_position: 1850,
    z_position: 0.4,
    width: 450,
    opacity: 1,
    project: {
      id: "animanga-gallery-90",
      data: { title: "Edgerunners", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1080, height: 1775 },
      url: "/assets/hero/eijunmiyuki.avif",
      id: "img-91",
    },
    x_position: 2680,
    y_position: 1652,
    z_position: 0.1,
    width: 150,
    opacity: 1,
    project: {
      id: "animanga-gallery-91",
      data: { title: "Eijun & Miyuki", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 736, height: 886 },
      url: "/assets/hero/jjk.avif",
      id: "img-92",
    },
    x_position: 1420,
    y_position: 1350,
    z_position: 0,
    width: 250,
    opacity: 1,
    project: {
      id: "animanga-gallery-92",
      data: { title: "Cursed Clash", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1800, height: 1798 },
      url: "/assets/hero/levi.avif",
      id: "img-93",
    },
    x_position: 850,
    y_position: 700,
    z_position: 0.2,
    width: 400,
    opacity: 1,
    project: {
      id: "animanga-gallery-93",
      data: { title: "Captain Levi", description: defaultDesc },
    },
  },
  {
    image: {
      dimensions: { width: 1200, height: 675 },
      url: "/assets/hero/mustangfmab.avif",
      id: "img-94",
    },
    x_position: 3400,
    y_position: 2950,
    z_position: 0.3,
    width: 450,
    opacity: 1,
    project: {
      id: "animanga-gallery-94",
      data: { title: "Flame Alchemist", description: defaultDesc },
    },
  },
];
