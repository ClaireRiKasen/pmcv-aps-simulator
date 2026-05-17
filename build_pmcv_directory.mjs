import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputDir = path.join(__dirname, "outputs", "pmcv-health-service-directory");
const outputPath = path.join(outputDir, "PMCV_Health_Service_Directory.xlsx");

const PMCV_DIRECTORY_URL = "https://gnmp.pmcv.com.au/health-service-directory/";
const BOARD_GUIDE_URL =
  "https://www.health.vic.gov.au/sites/default/files/2024-01/remuneration-guidance_for_public_hospitals_and_multi_purpose_services.pdf";
const HEALTH_PLAN_URL =
  "https://www.health.vic.gov.au/sites/default/files/2024-08/health-services-plan-final-report-expert-advisory-committee.pdf";

const LOCATION_SORT = { Metro: 1, Regional: 2, Rural: 3 };
const MONTH_ORDER = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const metroPublicHealthServices = [
  "Austin Health",
  "Eastern Health",
  "Monash Health",
  "Northern Health",
  "Western Health",
  "Alfred Health",
  "St Vincents Hospital",
  "The Royal Melbourne Hospital",
  "The Royal Childrens Hospital",
  "The Royal Womens Hospital",
  "Peter MacCallum Cancer Centre",
  "Royal Victorian Eye and Ear Hospital",
  "Forensicare (Victorian Institute of Forensic Mental Health)",
  "Parkville Youth Mental Health",
  "Mercy Health (Werribee)",
  "Mercy Health (Heidelberg)",
];

const regionalPublicHealthServices = [
  "Albury Wodonga Health",
  "Barwon Health",
  "Bendigo Health",
  "Goulburn Valley Health",
  "Grampians Health (Ballarat)",
  "Latrobe Regional Health",
  "South West Healthcare",
];

const boardClassMap = new Map(
  [
    ["Alexandra District Health", "C1"],
    ["Bairnsdale Regional Health Service", "A5"],
    ["Bass Coast Health", "A5"],
    ["Beaufort and Skipton Health Service", "C1"],
    ["Beechworth Health Service", "C1"],
    ["Benalla Health", "C1"],
    ["Boort District Health", "C1"],
    ["Casterton Memorial Hospital", "C1"],
    ["Central Gippsland Health Service", "A5"],
    ["Central Highlands Health Service", "C1"],
    ["Cohuna District Hospital", "C1"],
    ["Colac Area Health", "C1"],
    ["Dhelkaya Health", "C1"],
    ["East Grampians Health Service", "C1"],
    ["East Wimmera Health Service", "C1"],
    ["Echuca Regional Health", "A5"],
    ["Gippsland Southern Health Service", "C1"],
    ["Great Ocean Road Health", "C1"],
    ["Heathcote Health", "C1"],
    ["Heywood Rural Health", "C1"],
    ["Inglewood and Districts Health Service", "C1"],
    ["Kerang District Health", "C1"],
    ["Kooweerup Regional Health Service", "C1"],
    ["Kyabram and District Health Services", "C1"],
    ["Mansfield District Hospital", "C1"],
    ["Maryborough District Health Service", "C1"],
    ["Mildura Base Public Hospital", "A5"],
    ["Moyne Health Services", "C1"],
    ["NCN Health", "C1"],
    ["Northeast Health Wangaratta", "A5"],
    ["Omeo District Health", "C1"],
    ["Portland District Health", "C1"],
    ["Rochester and Elmore District Health Service", "C1"],
    ["Rural Northwest Health", "C1"],
    ["Seymour Health", "C1"],
    ["South Gippsland Hospital", "C1"],
    ["South West Healthcare", "A5"],
    ["Swan Hill District Health", "A5"],
    ["Tallangatta Health Service", "C1"],
    ["Terang and Mortlake Health Service", "C1"],
    ["West Gippsland Healthcare Group", "A5"],
    ["West Wimmera Health Service", "C1"],
    ["Western District Health Service", "A5"],
    ["Yarram and District Health Service", "C1"],
    ["Yarrawonga Health", "C1"],
    ["Alpine Health", "C1"],
    ["Corryong Health", "C1"],
    ["Mallee Track Health & Community Services", "C1"],
    ["Orbost Regional Health", "C1"],
    ["Robinvale District Health Service", "C1"],
    ["Timboon & District Healthcare Service", "C1"],
  ].map(([k, v]) => [normalize(k), v]),
);

const explicitSizeOverrides = [
  {
    aliases: ["The Royal Melbourne Hospital", "Royal Melbourne Hospital"],
    tier: "Major tertiary public hospital",
    rank: 1,
    basis:
      "Victorian Health Services Plan major tertiary hospital category",
    sizeSourceUrl: HEALTH_PLAN_URL,
  },
  {
    aliases: ["St Vincents Hospital"],
    tier: "Major tertiary public hospital",
    rank: 1,
    basis:
      "Victorian Health Services Plan major tertiary hospital category",
    sizeSourceUrl: HEALTH_PLAN_URL,
  },
  {
    aliases: ["Bayside Health Alfred Care Group", "Alfred Health"],
    tier: "Major tertiary public hospital",
    rank: 1,
    basis:
      "Victorian Health Services Plan major tertiary hospital category",
    sizeSourceUrl: HEALTH_PLAN_URL,
  },
  {
    aliases: ["The Royal Childrens Hospital"],
    tier: "Specialist childrens public hospital",
    rank: 1,
    basis:
      "Victorian Health Services Plan women and childrens hospital category",
    sizeSourceUrl: HEALTH_PLAN_URL,
  },
  {
    aliases: ["The Royal Womens Hospital"],
    tier: "Specialist womens public hospital",
    rank: 1,
    basis:
      "Victorian Health Services Plan women and childrens hospital category",
    sizeSourceUrl: HEALTH_PLAN_URL,
  },
  {
    aliases: ["Peter MacCallum Cancer Centre"],
    tier: "Statewide specialist public health service",
    rank: 1,
    basis:
      "Statewide specialist service profile aligned with major tertiary referral role",
    sizeSourceUrl: HEALTH_PLAN_URL,
  },
  {
    aliases: ["Royal Victorian Eye and Ear Hospital"],
    tier: "Statewide specialist public health service",
    rank: 1,
    basis:
      "Statewide specialist service profile aligned with major tertiary referral role",
    sizeSourceUrl: HEALTH_PLAN_URL,
  },
  {
    aliases: [
      "Forensicare (Victorian Institute of Forensic Mental Health)",
      "Forensicare",
    ],
    tier: "Statewide specialist public health service",
    rank: 1,
    basis:
      "Statewide specialist mental health service and Group A public health service",
    sizeSourceUrl: BOARD_GUIDE_URL,
  },
  {
    aliases: ["Parkville Youth Mental Health", "Orygen"],
    tier: "Statewide specialist youth mental health service",
    rank: 1,
    basis:
      "Specialist statewide youth mental health service within Victorian network listings",
    sizeSourceUrl:
      "https://www.health.vic.gov.au/local-health-service-networks",
  },
  {
    aliases: ["St Vincents Private Hospital Melbourne"],
    tier: "Large metropolitan private hospital",
    rank: 3,
    basis: "Private metropolitan hospital with broad specialty footprint",
    sizeSourceUrl: "https://www.svph.org.au/hospitals/melbourne",
  },
  {
    aliases: ["Holmesglen Private Hospital"],
    tier: "Metropolitan private hospital",
    rank: 4,
    basis: "Private metropolitan hospital",
    sizeSourceUrl: "https://www.healthscope.com.au/hospitals/holmesglen-private-hospital",
  },
  {
    aliases: ["Maryvale Private Hospital"],
    tier: "Regional private partner hospital",
    rank: 4,
    basis: "Private partner hospital within a regional combined stream",
    sizeSourceUrl: "https://maryvaleprivatehospital.com.au/",
  },
  {
    aliases: ["Calvary Health Care Bethlehem"],
    tier: "Specialist metropolitan hospital",
    rank: 4,
    basis: "Specialist metropolitan hospital",
    sizeSourceUrl: "https://www.calvarycare.org.au/bethlehem/",
  },
  {
    aliases: ["Mercy Health (Heidelberg)"],
    tier: "Large specialist womens hospital",
    rank: 2,
    basis: "Large metropolitan specialty maternity service",
    sizeSourceUrl: "https://health-services.mercyhealth.com.au/site/mercy-hospital-for-women/",
  },
  {
    aliases: ["Mercy Health (Werribee)"],
    tier: "Large metropolitan public hospital",
    rank: 2,
    basis: "Large metropolitan public hospital service",
    sizeSourceUrl: "https://health-services.mercyhealth.com.au/site/werribee-mercy-hospital/",
  },
];

const aliasToCanonical = [
  ["Bayside Health Alfred Care Group", "Alfred Health"],
  ["Bayside Health Peninsula Care Group", "Mercy Health (Heidelberg)"],
  ["Bayside Health Regional Care Group", "Bass Coast Health"],
  ["Bayside Health Regional Care Group (Bass Coast)", "Bass Coast Health"],
  ["Bayside Health Regional Care Group (Kooweerup)", "Kooweerup Regional Health Service"],
  ["Bayside Health (Gippsland Southern)", "Gippsland Southern Health Service"],
  ["Alexandra Heath & Eastern Health", "Alexandra District Health & Eastern Health"],
  ["Barwon Health & Great Ocean Road Health", "Barwon Health & Great Ocean Road Health"],
  ["Dhelkaya Health (Castlemaine)", "Dhelkaya Health"],
  ["Dhelkaya Health & Bendigo Health", "Dhelkaya Health & Bendigo Health"],
  ["Grampians Health (Edenhope)", "Western District Health Service"],
  ["Grampians Health (Horsham & Dimboola)", "West Wimmera Health Service"],
  ["Grampians Health (Stawell)", "East Grampians Health Service"],
  ["Latrobe Regional Health & Yarram District Health Service", "Latrobe Regional Health & Yarram and District Health Service"],
  ["Mallee Track Health and Community Service", "Mallee Track Health & Community Services"],
  ["Rochester and Elmore District Health", "Rochester and Elmore District Health Service"],
  ["Terang & Mortlake Health Service", "Terang and Mortlake Health Service"],
  ["Timboon & District Healthcare Service", "Timboon & District Healthcare Service"],
];

function normalize(value) {
  return decodeHtml(value || "")
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return (value || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    )
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&#038;/g, "&")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function curlGet(url) {
  return execFileSync("curl", ["-Ls", url], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function extractMatch(html, regex, group = 1) {
  const match = html.match(regex);
  return match ? decodeHtml(match[group]) : "";
}

function extractAll(html, regex, group = 1) {
  return [...html.matchAll(regex)].map((match) => decodeHtml(match[group]));
}

function parseListing(html) {
  const blocks = html.split(/<div class="jet-listing-grid__item /).slice(1);
  return blocks.map((block) => {
    const title = extractMatch(
      block,
      /<h2[^>]*class="elementor-heading-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/i,
    );
    const stream = extractMatch(
      block,
      /<div class="elementor-element elementor-element-64874dc[\s\S]*?<div class="elementor-widget-container">\s*([\s\S]*?)\s*<\/div>/i,
    );
    const fields = extractAll(
      block,
      /jet-listing-dynamic-field__content"\s*>\s*([\s\S]*?)<\/div>/gi,
    );
    const detailUrl = extractMatch(
      block,
      /<a href="(https:\/\/gnmp\.pmcv\.com\.au\/roles\/[^"]+)"/i,
    );
    const visibleBadges = [];
    if (block.includes(">Multi-Site<")) visibleBadges.push("Multi-Site");
    if (block.includes(">Multi-Intake<")) visibleBadges.push("Multi-Intake");
    return {
      title,
      stream,
      locationCategory: fields[0] || "",
      detailUrl,
      listingBadges: visibleBadges.join(", "),
    };
  });
}

function parseTotalPages(html) {
  const value = extractMatch(html, /data-pages="(\d+)"/i);
  return Number(value || 1);
}

function buildListingPageUrl(page) {
  if (page <= 1) return PMCV_DIRECTORY_URL;
  return `${PMCV_DIRECTORY_URL}?jsf=jet-engine:default&jet_paged=${page}`;
}

function parseDetail(html) {
  const heading = extractMatch(
    html,
    /<h1[^>]*class="elementor-heading-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
  );
  const closingDate = extractMatch(
    html,
    /Closing Date for Direct Hospital Applications:[\s\S]*?<\/strong><\/span>\s*([^<]+)<\/p>/i,
  );
  const websiteUrl = extractMatch(
    html,
    /<a href="([^"]+)" class="jet-listing-dynamic-link__link" target="_blank"><span class="jet-listing-dynamic-link__label">Health Service Website<\/span>/i,
  );
  const aboutRegionUrl = extractMatch(
    html,
    /<a href="([^"]+)" class="jet-listing-dynamic-link__link" target="_blank"><span class="jet-listing-dynamic-link__label">About Our Region<\/span>/i,
  );
  const contactEmail = extractMatch(
    html,
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    0,
  );
  const contactPhone = extractMatch(
    html,
    /(\(?0\d\)?\s?\d{4}\s?\d{4})/,
    1,
  );
  const fields = {};
  for (const label of [
    "Program/Rotation/Description",
    "Multi-Intake",
    "Intake Months",
    "Multi-Sites",
    "Site Locations",
    "Late Vacancy Management",
    "Information Session Details",
    "Subsequent Health Service Interview",
    "Type of Health Service Interview",
    "Interview Period",
  ]) {
    fields[label] = extractMatch(
      html,
      new RegExp(
        `<b>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:</b>\\s*([\\s\\S]*?)<\\/div>`,
        "i",
      ),
    );
  }

  return {
    heading,
    closingDate,
    websiteUrl,
    aboutRegionUrl,
    contactEmail,
    contactPhone,
    programDescription: fields["Program/Rotation/Description"],
    multiIntake: fields["Multi-Intake"],
    intakeMonths: normalizeMonths(fields["Intake Months"]),
    multiSites: fields["Multi-Sites"],
    siteLocations: fields["Site Locations"],
    lateVacancy: fields["Late Vacancy Management"],
    infoSession: fields["Information Session Details"],
    subsequentInterview: fields["Subsequent Health Service Interview"],
    interviewType: fields["Type of Health Service Interview"],
    interviewPeriod: fields["Interview Period"],
  };
}

function normalizeMonths(value) {
  if (!value) return "";
  const found = MONTH_ORDER.filter((month) =>
    new RegExp(`\\b${month}\\b`, "i").test(value),
  );
  return found.join(", ");
}

function canonicalizeHealthServiceName(name) {
  const aliasHit = aliasToCanonical.find(([alias]) => normalize(alias) === normalize(name));
  return aliasHit ? aliasHit[1] : name;
}

function splitComponents(name) {
  return canonicalizeHealthServiceName(name)
    .split(/\s+&\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function lookupOverride(name) {
  for (const override of explicitSizeOverrides) {
    if (override.aliases.some((alias) => normalize(alias) === normalize(name))) {
      return override;
    }
  }
  return null;
}

function getSizeInfo(serviceName) {
  const components = splitComponents(serviceName);
  const candidates = [];

  for (const component of components) {
    const override = lookupOverride(component) || lookupOverride(serviceName);
    if (override) {
      candidates.push(override);
      continue;
    }

    if (metroPublicHealthServices.some((item) => normalize(item) === normalize(component))) {
      candidates.push({
        tier: "Large metropolitan public health service",
        rank: 2,
        basis: "Victorian Department of Health public health service board classified as Group A",
        sizeSourceUrl: BOARD_GUIDE_URL,
      });
      continue;
    }

    if (regionalPublicHealthServices.some((item) => normalize(item) === normalize(component))) {
      candidates.push({
        tier: "Major regional public health service",
        rank: 2,
        basis: "Victorian Department of Health public health service board classified as Group A",
        sizeSourceUrl: BOARD_GUIDE_URL,
      });
      continue;
    }

    const boardClass = boardClassMap.get(normalize(component));
    if (boardClass === "A5") {
      candidates.push({
        tier: "A5 public hospital or health service",
        rank: 3,
        basis: "Victorian Department of Health board classification A5",
        sizeSourceUrl: BOARD_GUIDE_URL,
      });
      continue;
    }
    if (boardClass === "C1") {
      candidates.push({
        tier: "C1 rural public hospital or multipurpose service",
        rank: 4,
        basis: "Victorian Department of Health board classification C1",
        sizeSourceUrl: BOARD_GUIDE_URL,
      });
      continue;
    }
  }

  if (!candidates.length) {
    return {
      tier: "Unclassified or private partner service",
      rank: 5,
      basis: "No direct Victorian board classification found; kept as unmatched",
      sizeSourceUrl: BOARD_GUIDE_URL,
    };
  }

  return candidates.sort((a, b) => a.rank - b.rank)[0];
}

function buildRows(listingRows) {
  return listingRows.map((entry) => {
    const detailHtml = curlGet(entry.detailUrl);
    const detail = parseDetail(detailHtml);
    const healthService = canonicalizeHealthServiceName(
      entry.title.split("–")[0]?.trim() || entry.title,
    );
    const streamName =
      detail.heading.split("–")[1]?.trim() || entry.stream || "";
    const sizeInfo = getSizeInfo(healthService);
    return {
      locationCategory: normalizeLocation(entry.locationCategory),
      sizeRank: sizeInfo.rank,
      sizeTier: sizeInfo.tier,
      sizeBasis: sizeInfo.basis,
      healthService,
      stream: normalizeStream(entry.stream || streamName),
      streamDisplay: streamName,
      programDescription: detail.programDescription,
      intakeMonths: detail.intakeMonths,
      multiIntake: normalizeYN(detail.multiIntake),
      multiSite: normalizeYN(detail.multiSites),
      siteLocations: detail.siteLocations,
      closingDate: detail.closingDate,
      lateVacancy: normalizeYN(detail.lateVacancy),
      websiteUrl: detail.websiteUrl,
      aboutRegionUrl: detail.aboutRegionUrl,
      pmcvDetailUrl: entry.detailUrl,
      listingBadges: entry.listingBadges,
      contactEmail: detail.contactEmail,
      contactPhone: detail.contactPhone,
      infoSession: detail.infoSession,
      subsequentInterview: detail.subsequentInterview,
      interviewType: detail.interviewType,
      interviewPeriod: detail.interviewPeriod,
      sizeSourceUrl: sizeInfo.sizeSourceUrl,
      sortLocation: LOCATION_SORT[normalizeLocation(entry.locationCategory)] || 9,
      isMentalHealth:
        /mental health/i.test(entry.stream) || /mental health/i.test(streamName),
      intakeMonthCount: detail.intakeMonths ? detail.intakeMonths.split(",").length : 0,
    };
  });
}

function normalizeYN(value) {
  if (!value) return "";
  if (/^y(es)?$/i.test(value)) return "Yes";
  if (/^n(o)?$/i.test(value)) return "No";
  return value;
}

function normalizeLocation(value) {
  const v = (value || "").trim().toLowerCase();
  if (v === "metro") return "Metro";
  if (v === "regional") return "Regional";
  if (v === "rural") return "Rural";
  return value || "Unknown";
}

function normalizeStream(value) {
  const v = (value || "").trim();
  if (/nursing\/midwifery/i.test(v) || /dual degree/i.test(v)) {
    return "Nursing/Midwifery";
  }
  return v.replace("Program", "").trim();
}

function sortRows(rows) {
  rows.sort((a, b) => {
    if (a.sortLocation !== b.sortLocation) return a.sortLocation - b.sortLocation;
    if (a.sizeRank !== b.sizeRank) return a.sizeRank - b.sizeRank;
    if (a.healthService !== b.healthService) {
      return a.healthService.localeCompare(b.healthService);
    }
    return a.streamDisplay.localeCompare(b.streamDisplay);
  });
}

function toSheetRows(rows) {
  return rows.map((row, index) => [
    index + 1,
    row.locationCategory,
    row.sizeRank,
    row.sizeTier,
    row.sizeBasis,
    row.healthService,
    row.stream,
    row.streamDisplay,
    row.programDescription,
    row.intakeMonths,
    row.multiIntake,
    row.multiSite,
    row.siteLocations,
    row.closingDate,
    row.lateVacancy,
    row.websiteUrl,
    row.aboutRegionUrl,
    row.pmcvDetailUrl,
    row.contactEmail,
    row.contactPhone,
    row.infoSession,
    row.subsequentInterview,
    row.interviewType,
    row.interviewPeriod,
    row.sizeSourceUrl,
  ]);
}

function makeSummaryRows(rows) {
  const byLocation = ["Metro", "Regional", "Rural"].map((location) => {
    const subset = rows.filter((row) => row.locationCategory === location);
    const mh = subset.filter((row) => row.isMentalHealth).length;
    return [location, subset.length, mh];
  });

  const byTierMap = new Map();
  for (const row of rows) {
    const key = `${row.sizeRank}|${row.sizeTier}`;
    byTierMap.set(key, (byTierMap.get(key) || 0) + 1);
  }
  const byTier = [...byTierMap.entries()]
    .map(([key, count]) => {
      const [rank, tier] = key.split("|");
      return [Number(rank), tier, count];
    })
    .sort((a, b) => a[0] - b[0]);

  return { byLocation, byTier };
}

function applyHeader(range, fill = "#0F4C5C") {
  range.format = {
    fill,
    font: { bold: true, color: "#FFFFFF" },
    verticalAlignment: "center",
  };
}

function applyBodyTableStyle(sheet, rangeAddress, rowCount) {
  const table = sheet.tables.add(rangeAddress, true, `T_${sheet.name.replace(/[^A-Za-z0-9]/g, "")}`);
  table.style = "TableStyleMedium2";
  table.showBandedColumns = false;
  table.showFilterButton = true;
  sheet.freezePanes.freezeRows(3);
  sheet.getRange(`A3:Y${rowCount + 2}`).format.wrapText = true;
  sheet.getRange(`A3:Y${rowCount + 2}`).format.verticalAlignment = "top";
  return table;
}

function setColumnWidths(sheet, widths) {
  widths.forEach((width, idx) => {
    sheet.getRangeByIndexes(0, idx, 1, 1).format.columnWidthPx = width;
  });
}

async function buildWorkbook(rows) {
  const workbook = Workbook.create();
  const summarySheet = workbook.worksheets.add("Summary");
  const allProgramsSheet = workbook.worksheets.add("All Programs");
  const mentalHealthSheet = workbook.worksheets.add("Mental Health");
  const methodsSheet = workbook.worksheets.add("Methods");
  const builtAt = new Date().toISOString().slice(0, 16).replace("T", " ");

  const headers = [
    "Sort Order",
    "Metro / Regional / Rural",
    "Service Size Rank",
    "Service Size Tier",
    "Size Research Basis",
    "Health Service",
    "Stream",
    "Stream Display",
    "Program / Rotation / Description",
    "Intake Months",
    "Multi-Intake",
    "Multi-Site",
    "Site Locations",
    "Closing Date",
    "Late Vacancy",
    "Health Service Website",
    "About Our Region",
    "PMCV Detail Page",
    "Contact Email",
    "Contact Phone",
    "Information Session Details",
    "Subsequent Interview",
    "Interview Type",
    "Interview Period",
    "Size Source URL",
  ];

  const dataRows = toSheetRows(rows);
  const mentalHealthRows = toSheetRows(rows.filter((row) => row.isMentalHealth));

  summarySheet.getRange("A1:H1").values = [[
    "PMCV Health Service Directory",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]];
  summarySheet.getRange("A1:H1").merge();
  summarySheet.getRange("A1:H1").format = {
    fill: "#0B3C49",
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  summarySheet.getRange("A1:H1").format.rowHeightPx = 30;
  summarySheet.getRange("A2:H2").values = [[
    "Source page",
    PMCV_DIRECTORY_URL,
    "Built",
    builtAt,
    "Programs",
    rows.length,
    "Mental health",
    rows.filter((row) => row.isMentalHealth).length,
  ]];

  const summary = makeSummaryRows(rows);
  summarySheet.getRange("A4:C4").values = [["Category", "Programs", "Mental Health"]];
  applyHeader(summarySheet.getRange("A4:C4"), "#2C7A7B");
  summarySheet.getRange(`A5:C${4 + summary.byLocation.length}`).values = summary.byLocation;

  summarySheet.getRange("E4:G4").values = [["Size Rank", "Size Tier", "Programs"]];
  applyHeader(summarySheet.getRange("E4:G4"), "#8C4F22");
  summarySheet.getRange(`E5:G${4 + summary.byTier.length}`).values = summary.byTier;

  summarySheet.getRange("A10:D10").values = [["Notes", null, null, null]];
  summarySheet.getRange("A10:D10").merge();
  applyHeader(summarySheet.getRange("A10:D10"), "#5C6B73");
  summarySheet.getRange("A11:D15").values = [
    [
      "Rows are sorted first by Metro/Regional/Rural and then by researched service-size tier.",
      "Size tiers use Victorian Department of Health board classifications where available.",
      "",
      "",
    ],
    [
      "Mental health programs are duplicated onto the Mental Health tab.",
      "",
      "",
      "",
    ],
    [
      "Intake month values come from each PMCV stream detail page.",
      "",
      "",
      "",
    ],
    [
      "Combined streams use the largest matched partner service when assigning size tier.",
      "",
      "",
      "",
    ],
    [
      "Vacancies on PMCV were shown as zero on 17 May 2026, so position counts were not included.",
      "",
      "",
      "",
    ],
  ];
  summarySheet.getRange("A11:D15").format.wrapText = true;
  setColumnWidths(summarySheet, [150, 260, 110, 110, 110, 90, 110, 90]);

  const summaryChartRange = summarySheet.getRange("A4:C7");
  const summaryChart = summarySheet.charts.add("columnClustered", summaryChartRange);
  summaryChart.title = "Programs by Location";
  summaryChart.top = 20;
  summaryChart.left = 520;
  summaryChart.height = 260;
  summaryChart.width = 420;

  allProgramsSheet.getRange("A1:Y1").values = [[
    "All PMCV directory programs",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]];
  allProgramsSheet.getRange("A1:Y1").merge();
  allProgramsSheet.getRange("A1:Y1").format = {
    fill: "#0B3C49",
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
  };
  allProgramsSheet.getRange("A2:Y2").values = [headers];
  applyHeader(allProgramsSheet.getRange("A2:Y2"));
  allProgramsSheet.getRange(`A3:Y${rows.length + 2}`).values = dataRows;
  applyBodyTableStyle(allProgramsSheet, `A2:Y${rows.length + 2}`, rows.length);
  setColumnWidths(allProgramsSheet, [
    70, 110, 90, 170, 220, 190, 120, 150, 320, 130, 90, 90, 180, 120, 90, 220, 220, 220, 180, 110, 220, 120, 120, 120, 220,
  ]);

  mentalHealthSheet.getRange("A1:Y1").values = [[
    "Mental health programs",
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]];
  mentalHealthSheet.getRange("A1:Y1").merge();
  mentalHealthSheet.getRange("A1:Y1").format = {
    fill: "#4C1D95",
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
  };
  mentalHealthSheet.getRange("A2:Y2").values = [headers];
  applyHeader(mentalHealthSheet.getRange("A2:Y2"), "#6D28D9");
  if (mentalHealthRows.length) {
    mentalHealthSheet.getRange(`A3:Y${mentalHealthRows.length + 2}`).values = mentalHealthRows;
    applyBodyTableStyle(mentalHealthSheet, `A2:Y${mentalHealthRows.length + 2}`, mentalHealthRows.length);
  }
  setColumnWidths(mentalHealthSheet, [
    70, 110, 90, 170, 220, 190, 120, 150, 320, 130, 90, 90, 180, 120, 90, 220, 220, 220, 180, 110, 220, 120, 120, 120, 220,
  ]);

  methodsSheet.getRange("A1:D1").values = [["Methodology", null, null, null]];
  methodsSheet.getRange("A1:D1").merge();
  methodsSheet.getRange("A1:D1").format = {
    fill: "#334155",
    font: { bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
  };
  methodsSheet.getRange("A2:D2").values = [["Item", "Approach", "Source URL", "Notes"]];
  applyHeader(methodsSheet.getRange("A2:D2"), "#475569");
  methodsSheet.getRange("A3:D10").values = [
    ["Program list", "Scraped from the PMCV Health Service Directory page", PMCV_DIRECTORY_URL, "Directory page captured on 17 May 2026."],
    ["Intake months", "Taken from each PMCV stream detail page under More Info", PMCV_DIRECTORY_URL, "If multiple intake months were listed, they are kept in month order."],
    ["Location category", "Taken from the PMCV listing card labels", PMCV_DIRECTORY_URL, "Metro, Regional, or Rural."],
    ["Size rank 1", "Major tertiary or statewide specialist public service", HEALTH_PLAN_URL, "Used for major tertiary hospitals, women's/children's hospitals, and statewide specialist services."],
    ["Size rank 2", "Group A public health service / major regional public health service", BOARD_GUIDE_URL, "Board remuneration guide states all public health services are Group A boards."],
    ["Size rank 3", "A5 public hospital or health service", BOARD_GUIDE_URL, "Used for A5 public hospitals in the board-classification appendix."],
    ["Size rank 4", "C1 public hospital/multipurpose service or smaller specialist/private site", BOARD_GUIDE_URL, "Used for C1 services and smaller specialist/private partners."],
    ["Combined streams", "Highest-ranked matched partner determines size tier", BOARD_GUIDE_URL, "Example: a combined rural/regional stream matched to a large partner health service."],
  ];
  methodsSheet.getRange("A3:D10").format.wrapText = true;
  setColumnWidths(methodsSheet, [140, 320, 240, 320]);
  methodsSheet.freezePanes.freezeRows(2);

  return workbook;
}

async function main() {
  const firstPageHtml = curlGet(PMCV_DIRECTORY_URL);
  const totalPages = parseTotalPages(firstPageHtml);
  const listingRows = [];
  for (let page = 1; page <= totalPages; page += 1) {
    const html = page === 1 ? firstPageHtml : curlGet(buildListingPageUrl(page));
    listingRows.push(...parseListing(html));
  }
  const rows = buildRows(listingRows);
  sortRows(rows);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    path.join(outputDir, "pmcv_programs.json"),
    JSON.stringify(rows, null, 2),
  );

  const workbook = await buildWorkbook(rows);
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);

  console.log(
    JSON.stringify(
      {
        outputPath,
        totalPrograms: rows.length,
        mentalHealthPrograms: rows.filter((row) => row.isMentalHealth).length,
        uniqueServices: new Set(rows.map((row) => row.healthService)).size,
      },
      null,
      2,
    ),
  );
}

await main();
