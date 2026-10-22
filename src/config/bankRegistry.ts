/**
 * Declarative 61-Bank Strategy Registry
 * Maps all 61 Scheduled Commercial Banks without placeholder URLs or duplicate codes.
 * Covers 5 regulatory categories chartered by Bangladesh Bank.
 */

export type IngestionMode = "RAW_WEBPAGE" | "PDF_CIRCULAR" | "TREASURY_CIRCULAR_PDF" | "HYBRID";
export type BankCategory = "STATE_OWNED" | "SPECIALIZED" | "CONVENTIONAL_PCB" | "ISLAMIC" | "FOREIGN";

export interface BankConfig {
  bankCode: string;
  officialName: string;
  category: BankCategory;
  ingestionMode: IngestionMode;
  primaryUrl: string;
  secondarySocUrl?: string;
  localCalibrationFixture?: string;
  selectors?: {
    accordionButton?: string;
    tableContainer?: string;
    tabList?: string[];
  };
}

export const BANK_REGISTRY: BankConfig[] = [
  // ==========================================
  // 1. State-Owned Commercial Banks (SOCBs) (6)
  // ==========================================
  {
    bankCode: "SONALI",
    officialName: "Sonali Bank PLC",
    category: "STATE_OWNED",
    ingestionMode: "PDF_CIRCULAR",
    primaryUrl: "https://www.sonalibank.com.bd/PDF_file/intt_rates.pdf",
    secondarySocUrl: "https://www.sonalibank.com.bd/interest_rate.php",
  },
  {
    bankCode: "JANATA",
    officialName: "Janata Bank PLC",
    category: "STATE_OWNED",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.jb.com.bd/products/rate_of_interest",
    secondarySocUrl: "https://www.jb.com.bd/schedule_of_charges",
  },
  {
    bankCode: "AGRANI",
    officialName: "Agrani Bank PLC",
    category: "STATE_OWNED",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.agranibank.org/index.php/home/interest_rate/ql",
    secondarySocUrl: "https://www.agranibank.org",
  },
  {
    bankCode: "RUPALI",
    officialName: "Rupali Bank PLC",
    category: "STATE_OWNED",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.rupalibank.com.bd/corporate_profile.php",
    secondarySocUrl: "https://rupalibank.com.bd",
  },
  {
    bankCode: "BASIC",
    officialName: "BASIC Bank Limited",
    category: "STATE_OWNED",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://basicbankplc.com/en/rate-and-charge/rate-of-interest",
    secondarySocUrl: "https://basicbankplc.com",
  },
  {
    bankCode: "BDBL",
    officialName: "Bangladesh Development Bank PLC",
    category: "STATE_OWNED",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.bdbl.com.bd/pages/static-pages/interest-rate-29b598-6922e134933eb65569e2adb8",
    secondarySocUrl: "https://bdbl.com.bd",
  },

  // ==========================================
  // 2. Specialized Development Banks (3)
  // ==========================================
  {
    bankCode: "BKB",
    officialName: "Bangladesh Krishi Bank",
    category: "SPECIALIZED",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://krishibank.org.bd/interest-rate/",
    secondarySocUrl: "https://krishibank.org.bd",
  },
  {
    bankCode: "RAKUB",
    officialName: "Rajshahi Krishi Unnayan Bank",
    category: "SPECIALIZED",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://rakub.org.bd/prodDetail.php?prodId=12",
    secondarySocUrl: "https://rakub.org.bd",
  },
  {
    bankCode: "PKB",
    officialName: "Probashi Kolyon Bank",
    category: "SPECIALIZED",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "http://pkb.gov.bd",
    secondarySocUrl: "http://pkb.gov.bd",
  },

  // ==========================================
  // 3. Conventional Private Commercial Banks (33)
  // ==========================================
  {
    bankCode: "UCB",
    officialName: "United Commercial Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "PDF_CIRCULAR",
    primaryUrl: "https://www.ucb.com.bd/reports/interest-rates/instruction-circular-no1634full-deposit-productsucb-websi.pdf",
    secondarySocUrl: "https://www.ucb.com.bd",
    localCalibrationFixture: "C:\\Users\\fardi\\Downloads\\instruction-circular-no1634full-deposit-productsucb-websi.pdf",
  },
  {
    bankCode: "CITY",
    officialName: "City Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.citybankplc.com/gsi/conventional-banking-products",
    secondarySocUrl: "https://www.citybankplc.com/charges",
    selectors: {
      accordionButton: ".accordion-title, button[aria-expanded='false'], .panel-heading",
      tableContainer: "table",
      tabList: ["Conventional", "Islamic", "Priority"],
    },
  },
  {
    bankCode: "BRAC",
    officialName: "BRAC Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "TREASURY_CIRCULAR_PDF",
    primaryUrl: "https://bracbank.com/en/page/deposit-interest-rate",
    secondarySocUrl: "https://brackweb.s3.ap-southeast-1.amazonaws.com/uploads/all/BRAC_Bank_Deposit_Interest_Rate_Effective_from_October_15,_20266acf796d088b7.pdf",
  },
  {
    bankCode: "EBL",
    officialName: "Eastern Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://ebl.com.bd/retail-deposits",
    secondarySocUrl: "https://ebl.com.bd/schedule-of-charges",
  },
  {
    bankCode: "DBBL",
    officialName: "Dutch-Bangla Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.dutchbanglabank.com/interest-rates.html",
    secondarySocUrl: "https://www.dutchbanglabank.com",
  },
  {
    bankCode: "PRIME",
    officialName: "Prime Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.primebank.com.bd/deposits",
    secondarySocUrl: "https://www.primebank.com.bd",
  },
  {
    bankCode: "MTB",
    officialName: "Mutual Trust Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.mutualtrustbank.com/rates/",
    secondarySocUrl: "https://www.mutualtrustbank.com",
  },
  {
    bankCode: "DHAKA",
    officialName: "Dhaka Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://dhakabankltd.com/interest-rates/",
    secondarySocUrl: "https://dhakabankltd.com",
  },
  {
    bankCode: "PUBALI",
    officialName: "Pubali Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.pubalibangla.com/interest-rates",
    secondarySocUrl: "https://www.pubalibangla.com",
  },
  {
    bankCode: "MBL",
    officialName: "Mercantile Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.mblbd.com/interest_rate",
    secondarySocUrl: "https://www.mblbd.com",
  },
  {
    bankCode: "SEBL",
    officialName: "Southeast Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.southeastbank.com.bd/rates",
    secondarySocUrl: "https://www.southeastbank.com.bd",
  },
  {
    bankCode: "NCC",
    officialName: "NCC Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "TREASURY_CIRCULAR_PDF",
    primaryUrl: "https://www.nccbank.com.bd/NccbRates",
    secondarySocUrl: "https://www.nccbank.com.bd/assets/files/rates_files/Deposit_Rate_chart_01.10.2026.pdf",
  },
  {
    bankCode: "PREMIER",
    officialName: "Premier Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://premierbankltd.com/pbl/interest-rates/",
    secondarySocUrl: "https://premierbankltd.com",
  },
  {
    bankCode: "TRUST",
    officialName: "Trust Bank Limited",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.tblbd.com/deposit-products",
    secondarySocUrl: "https://www.tblbd.com",
  },
  {
    bankCode: "JAMUNA",
    officialName: "Jamuna Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://jamunabankbd.com/rates",
    secondarySocUrl: "https://jamunabankbd.com",
  },
  {
    bankCode: "BANKASIA",
    officialName: "Bank Asia PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.bankasia-bd.com/rates",
    secondarySocUrl: "https://www.bankasia-bd.com",
  },
  {
    bankCode: "ONEBANK",
    officialName: "ONE Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.onebank.com.bd/rates",
    secondarySocUrl: "https://www.onebank.com.bd",
  },
  {
    bankCode: "AB",
    officialName: "AB Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://abbl.com/rates",
    secondarySocUrl: "https://abbl.com",
  },
  {
    bankCode: "IFIC",
    officialName: "IFIC Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.ificbank.com.bd/rates",
    secondarySocUrl: "https://www.ificbank.com.bd",
  },
  {
    bankCode: "UTTARA",
    officialName: "Uttara Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.uttarabank-bd.com/home/interestrate",
    secondarySocUrl: "https://www.uttarabank-bd.com/home/interestrate",
  },
  {
    bankCode: "NBL",
    officialName: "National Bank Limited",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.nblbd.com/rates",
    secondarySocUrl: "https://www.nblbd.com",
  },
  {
    bankCode: "NRBC",
    officialName: "NRB Commercial Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.nrbcommercialbank.com/rates",
    secondarySocUrl: "https://www.nrbcommercialbank.com",
  },
  {
    bankCode: "NRB",
    officialName: "NRB Bank Limited",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.nrbbankbd.com/rates",
    secondarySocUrl: "https://www.nrbbankbd.com",
  },
  {
    bankCode: "MEGHNA",
    officialName: "Meghna Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.meghnabank.com.bd/rates",
    secondarySocUrl: "https://www.meghnabank.com.bd",
  },
  {
    bankCode: "MDB",
    officialName: "Midland Bank Limited",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.midlandbankbd.net/rates",
    secondarySocUrl: "https://www.midlandbankbd.net",
  },
  {
    bankCode: "MODHUMOTI",
    officialName: "Modhumoti Bank Limited",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "TREASURY_CIRCULAR_PDF",
    primaryUrl: "https://www.modhumotibankplc.com/interest-rate/",
    secondarySocUrl: "https://www.modhumotibankplc.com/wp-content/uploads/2026/09/INT_RATE_DEPOSITS_OCT_2026-Upload.pdf",
  },
  {
    bankCode: "SBAC",
    officialName: "South Bangla Agriculture and Commerce Bank",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "TREASURY_CIRCULAR_PDF",
    primaryUrl: "https://cdn.sbacbank.com/files/documents/deposit-interest-rates.pdf",
    secondarySocUrl: "https://cdn.sbacbank.com/files/documents/deposit-interest-rates.pdf",
  },
  {
    bankCode: "SHIMANTO",
    officialName: "Shimanto Bank Limited",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://shimantobank.com/interest-rates/deposit",
    secondarySocUrl: "https://shimantobank.com/interest-rates/deposit",
  },
  {
    bankCode: "COMMUNITY",
    officialName: "Community Bank Bangladesh PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://communitybankbd.com/rates",
    secondarySocUrl: "https://communitybankbd.com",
  },
  {
    bankCode: "BENGAL",
    officialName: "Bengal Commercial Bank Limited",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.bengalbank.com/interest-rates",
    secondarySocUrl: "https://www.bengalbank.com/interest-rates",
  },
  {
    bankCode: "CITIZENS",
    officialName: "Citizens Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.citizensbankbd.com/rates/deposit-rate",
    secondarySocUrl: "https://www.citizensbankbd.com/rates/deposit-rate",
  },
  {
    bankCode: "PADMA",
    officialName: "Padma Bank PLC",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.padmabankbd.com/rates",
    secondarySocUrl: "https://www.padmabankbd.com",
  },
  {
    bankCode: "BCBL",
    officialName: "Bangladesh Commerce Bank Limited",
    category: "CONVENTIONAL_PCB",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.bcblbd.com/rates",
    secondarySocUrl: "https://www.bcblbd.com",
  },

  // ==========================================
  // 4. Full-Fledged Islamic Commercial Banks (10)
  // ==========================================
  {
    bankCode: "IBBL",
    officialName: "Islami Bank Bangladesh PLC",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.islamibankbd.com/mudaraba-rates",
    secondarySocUrl: "https://www.islamibankbd.com",
  },
  {
    bankCode: "AIBL",
    officialName: "Al-Arafah Islami Bank PLC",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.aibl.com.bd/rates",
    secondarySocUrl: "https://www.aibl.com.bd",
  },
  {
    bankCode: "SIBL",
    officialName: "Social Islami Bank PLC",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.siblbd.com/rates",
    secondarySocUrl: "https://www.siblbd.com",
  },
  {
    bankCode: "SJIBL",
    officialName: "Shahjalal Islami Bank PLC",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.sjiblbd.com/rates",
    secondarySocUrl: "https://www.sjiblbd.com",
  },
  {
    bankCode: "EXIM",
    officialName: "Export Import Bank of Bangladesh PLC",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.eximbankbd.com/rates",
    secondarySocUrl: "https://www.eximbankbd.com",
  },
  {
    bankCode: "FSIBL",
    officialName: "First Security Islami Bank PLC",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.fsiblbd.com/rates",
    secondarySocUrl: "https://www.fsiblbd.com",
  },
  {
    bankCode: "GIBL",
    officialName: "Global Islami Bank PLC",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.globalislamibankbd.com/rates",
    secondarySocUrl: "https://www.globalislamibankbd.com",
  },
  {
    bankCode: "UBL",
    officialName: "Union Bank PLC",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.unionbank.com.bd/rates",
    secondarySocUrl: "https://www.unionbank.com.bd",
  },
  {
    bankCode: "SBL",
    officialName: "Standard Bank PLC (Islamic)",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.standardbankbd.com/rates",
    secondarySocUrl: "https://www.standardbankbd.com",
  },
  {
    bankCode: "ICBISLAMIC",
    officialName: "ICB Islamic Bank Limited",
    category: "ISLAMIC",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.icbislamic-bank.com/rates",
    secondarySocUrl: "https://www.icbislamic-bank.com",
  },

  // ==========================================
  // 5. Foreign Commercial Banks (FCBs) (9)
  // ==========================================
  {
    bankCode: "SCB",
    officialName: "Standard Chartered Bank Bangladesh",
    category: "FOREIGN",
    ingestionMode: "PDF_CIRCULAR",
    primaryUrl: "https://www.sc.com/bd/rates/",
    secondarySocUrl: "https://www.sc.com/bd",
  },
  {
    bankCode: "HSBC",
    officialName: "HSBC Bangladesh",
    category: "FOREIGN",
    ingestionMode: "PDF_CIRCULAR",
    primaryUrl: "https://www.hsbc.com.bd/rates",
    secondarySocUrl: "https://www.hsbc.com.bd",
  },
  {
    bankCode: "CITI",
    officialName: "Citibank N.A. Bangladesh",
    category: "FOREIGN",
    ingestionMode: "PDF_CIRCULAR",
    primaryUrl: "https://www.citigroup.com/citi/about/countries-and-jurisdictions/bangladesh.html",
    secondarySocUrl: "https://www.citigroup.com",
  },
  {
    bankCode: "CBC",
    officialName: "Commercial Bank of Ceylon PLC",
    category: "FOREIGN",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.combank.net.bd/tariffs/interest-rate.html",
    secondarySocUrl: "https://www.combank.net.bd/assets/documents/Schedule-of-Charges.pdf",
  },
  {
    bankCode: "WOORI",
    officialName: "Woori Bank Bangladesh",
    category: "FOREIGN",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://spot.wooribank.com/pot/Dream?withyou=BDBD00001",
    secondarySocUrl: "https://spot.wooribank.com",
  },
  {
    bankCode: "ALFALAH",
    officialName: "Bank Alfalah Limited Bangladesh",
    category: "FOREIGN",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.bankalfalah.com/bd/rates",
    secondarySocUrl: "https://www.bankalfalah.com",
  },
  {
    bankCode: "SBI",
    officialName: "State Bank of India Bangladesh",
    category: "FOREIGN",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://bd.statebank/interest-rates",
    secondarySocUrl: "https://bd.statebank",
  },
  {
    bankCode: "HBL",
    officialName: "Habib Bank Limited Bangladesh",
    category: "FOREIGN",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.hbl.com/bangladesh/rates",
    secondarySocUrl: "https://www.hbl.com",
  },
  {
    bankCode: "NBP",
    officialName: "National Bank of Pakistan",
    category: "FOREIGN",
    ingestionMode: "RAW_WEBPAGE",
    primaryUrl: "https://www.nbp.com.pk/bangladesh",
    secondarySocUrl: "https://www.nbp.com.pk",
  },
];

export function getBankConfig(code: string): BankConfig | undefined {
  const normalized = code.trim().toUpperCase();
  return BANK_REGISTRY.find(
    (b) => b.bankCode === normalized || b.bankCode.replace(/_/g, "") === normalized
  );
}

export function getAllBanks(): BankConfig[] {
  return [...BANK_REGISTRY];
}

export function getBanksByCategory(category: BankCategory): BankConfig[] {
  return BANK_REGISTRY.filter((b) => b.category === category);
}
