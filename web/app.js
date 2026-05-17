const form = document.querySelector("#candidate-form");
const preferenceList = document.querySelector("#preference-list");
const rowTemplate = document.querySelector("#preference-row-template");
const clearButton = document.querySelector("#clear-form");
const fillMentalHealthButton = document.querySelector("#fill-mental-health");

const summaryName = document.querySelector("#summary-name");
const summaryPriority = document.querySelector("#summary-priority");
const summaryRanking = document.querySelector("#summary-ranking");
const summaryPreferences = document.querySelector("#summary-preferences");
const candidateBaseline = document.querySelector("#candidate-baseline");
const positionBaseline = document.querySelector("#position-baseline");
const campusBaseline = document.querySelector("#campus-baseline");
const algorithmBaseline = document.querySelector("#algorithm-baseline");
const benchmarkBaseline = document.querySelector("#benchmark-baseline");
const runSimulationButton = document.querySelector("#run-simulation");
const simulationSeedInput = document.querySelector("#simulation-seed");
const resultGrid = document.querySelector("#result-grid");
const matchOutcomes = document.querySelector("#match-outcomes");
const preferenceOutcomes = document.querySelector("#preference-outcomes");
const regionalOutcomes = document.querySelector("#regional-outcomes");
const capacityOutcomes = document.querySelector("#capacity-outcomes");
const currentCandidateOutcomes = document.querySelector("#current-candidate-outcomes");
const currentCandidateBadge = document.querySelector("#current-candidate-badge");
const competitiveServices = document.querySelector("#competitive-services");

const storageKey = "pmcv-aps-simulator-candidate";

const state = {
  programs: Array.isArray(window.PMCV_PROGRAMS) ? window.PMCV_PROGRAMS : [],
  simulationConfig: {
    totalCandidates: 4500,
    priorityGroup1Percent: 70,
    priorityGroup2Percent: 30,
    totalPositions: 1600,
    privateWithdrawalCount: 400,
  },
  servicePositions: window.PMCV_SERVICE_POSITIONS || null,
  campusBaseline: window.PMCV_CAMPUS_BASELINE || null,
  preferenceBaseline: window.PMCV_SIMULATION_CONFIG || null,
  serviceCatalog: [],
  latestSimulation: null,
};

function renderCandidateBaseline() {
  const {
    totalCandidates,
    priorityGroup1Percent,
    priorityGroup2Percent,
    privateWithdrawalCount,
  } = state.simulationConfig;
  const group1Count = Math.round((totalCandidates * priorityGroup1Percent) / 100);
  const group2Count = totalCandidates - group1Count;
  const activePmcvPool = totalCandidates - privateWithdrawalCount;

  candidateBaseline.innerHTML = `
    <li>Total graduating candidates: ${totalCandidates.toLocaleString("en-AU")}</li>
    <li>Priority Group 1 baseline: ${priorityGroup1Percent}% (${group1Count.toLocaleString("en-AU")} candidates)</li>
    <li>Priority Group 2 baseline: ${priorityGroup2Percent}% (${group2Count.toLocaleString("en-AU")} candidates)</li>
    <li>Estimated withdrawals to private hospitals: ${privateWithdrawalCount.toLocaleString("en-AU")}</li>
    <li>Active PMCV candidate pool: ${activePmcvPool.toLocaleString("en-AU")}</li>
  `;
}

function renderPositionBaseline() {
  if (!state.servicePositions) {
    positionBaseline.innerHTML = "<li>Position model not loaded.</li>";
    return;
  }

  const { meta, services } = state.servicePositions;
  const imputedCount = services.filter((service) =>
    service.estimationMethod.startsWith("imputed_"),
  ).length;

  positionBaseline.innerHTML = `
    <li>Strict annual PMCV position cap: ${meta.strictAnnualPositionCap.toLocaleString("en-AU")}</li>
    <li>Raw workbook estimate before scaling: ${Math.round(meta.sourceWorkbookRawTotalEstimate).toLocaleString("en-AU")}</li>
    <li>Health services in model: ${services.length.toLocaleString("en-AU")}</li>
    <li>Services with imputed rough values: ${imputedCount.toLocaleString("en-AU")}</li>
  `;
}

function renderCampusBaseline() {
  if (!state.campusBaseline) {
    campusBaseline.innerHTML = "<li>Campus baseline not loaded.</li>";
    return;
  }

  const campuses = state.campusBaseline.campuses;
  const metroCampuses = campuses.filter((campus) =>
    [
      "North Metro",
      "West Metro",
      "East Metro",
      "Outer East Metro",
      "South East Metro",
      "Bayside / South Metro",
      "Frankston / Peninsula",
      "Inner Metro",
      "Parkville",
    ].includes(campus.hub),
  );
  const regionalCampuses = campuses.length - metroCampuses.length;

  campusBaseline.innerHTML = `
    <li>Approximate statewide campus pool: ${state.campusBaseline.meta.statewideApproxStudents.toLocaleString("en-AU")} students</li>
    <li>Campuses in model: ${campuses.length.toLocaleString("en-AU")}</li>
    <li>Metro-oriented campuses: ${metroCampuses.length.toLocaleString("en-AU")}</li>
    <li>Regional / rural campuses: ${regionalCampuses.toLocaleString("en-AU")}</li>
  `;
}

function renderAlgorithmBaseline() {
  if (!state.preferenceBaseline) {
    algorithmBaseline.innerHTML = "<li>Preference algorithm baseline not loaded.</li>";
    return;
  }

  const group1 = state.preferenceBaseline.preferenceModel.priorityGroup1;
  const group2 = state.preferenceBaseline.preferenceModel.priorityGroup2;

  algorithmBaseline.innerHTML = `
    <li>Candidate campus is sampled from the nursing-campus distribution baseline.</li>
    <li>Priority Group 1 mix target: ${group1.targetMixAcrossSixPreferences.metro} metro + ${group1.targetMixAcrossSixPreferences.regionalOrRural} regional/rural preferences.</li>
    <li>Priority Group 2 mix target: ${group2.targetMixAcrossSixPreferences.metro} metro + ${group2.targetMixAcrossSixPreferences.regionalOrRural} regional/rural preferences.</li>
    <li>Preference scoring is driven by campus proximity, health service location, service size, and a smaller random factor.</li>
  `;
}

function renderBenchmarkBaseline() {
  const benchmarks = state.preferenceBaseline?.knownBenchmarks;
  if (!benchmarks?.length) {
    benchmarkBaseline.innerHTML = "<li>No demand benchmarks loaded.</li>";
    return;
  }

  const wghg = benchmarks.find((item) => item.serviceName.includes("West Gippsland"));
  const rch = benchmarks.find((item) => item.serviceName.includes("Royal Children's"));

  benchmarkBaseline.innerHTML = `
    <li>${wghg.serviceName}: ${wghg.annualPositionsKnown} positions and about ${wghg.applicationsKnown} applications (${wghg.applicationsPerPosition.toFixed(1)} applications per position).</li>
    <li>${rch.serviceName}: more than ${rch.applicationsKnownLowerBound} applications, about ${rch.interviewsEstimatedRange[0]}-${rch.interviewsEstimatedRange[1]} interviews, and about ${rch.offersEstimatedRange[0]}-${rch.offersEstimatedRange[1]} offers.</li>
    <li>These benchmarks will be used to calibrate service competitiveness and interview selectivity in the match model.</li>
  `;
}

function createSeededRandom(seedInput) {
  const normalized = String(seedInput || "2027");
  let seed = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    seed = (seed * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  return function seededRandom() {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function canonicalize(value) {
  return String(value || "")
    .toLowerCase()
    .replaceAll("&", " and ")
    .replaceAll(/[()'.,/+-]/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

function getCampusHubOrder(hub) {
  return state.preferenceBaseline?.locationModel?.campusHubAffinity?.[hub] || [hub];
}

function deriveServiceHub(serviceName, region) {
  const name = canonicalize(serviceName);

  if (name.includes("albury")) return "Albury-Wodonga";
  if (name.includes("shepparton") || name.includes("goulburn")) return "Shepparton";
  if (name.includes("mildura")) return "Mildura";
  if (name.includes("bendigo") || name.includes("castlemaine") || name.includes("heathcote")) {
    return "Bendigo";
  }
  if (
    name.includes("ballarat") ||
    name.includes("grampians") ||
    name.includes("horsham") ||
    name.includes("stawell")
  ) {
    return "Ballarat";
  }
  if (name.includes("geelong") || name.includes("barwon") || name.includes("colac")) return "Geelong";
  if (
    name.includes("warrnambool") ||
    name.includes("south west") ||
    name.includes("portland") ||
    name.includes("moyne") ||
    name.includes("timboon") ||
    name.includes("camperdown")
  ) {
    return "Warrnambool";
  }
  if (
    name.includes("latrobe") ||
    name.includes("gippsland") ||
    name.includes("bairnsdale") ||
    name.includes("orbost") ||
    name.includes("sale") ||
    name.includes("yaram") ||
    name.includes("warragul")
  ) {
    return "Gippsland";
  }
  if (
    name.includes("frankston") ||
    name.includes("peninsula") ||
    name.includes("moorabbin") ||
    name.includes("werribee")
  ) {
    return "Frankston / Peninsula";
  }
  if (
    name.includes("alfred") ||
    name.includes("st vincent") ||
    name.includes("melbourne") ||
    name.includes("peter mac") ||
    name.includes("women")
  ) {
    return "Inner Metro";
  }
  if (name.includes("royal children") || name.includes("parkville") || name.includes("eye and ear")) {
    return "Parkville";
  }
  if (name.includes("northern") || name.includes("bundoora") || name.includes("kilmore")) {
    return "North Metro";
  }
  if (name.includes("eastern") || name.includes("wantirna") || name.includes("box hill")) {
    return "East Metro";
  }
  if (name.includes("monash") || name.includes("clayton")) {
    return "South East Metro";
  }
  if (name.includes("western") || name.includes("sunshine") || name.includes("footscray")) {
    return "West Metro";
  }

  if (region === "Metro") return "Inner Metro";
  if (region === "Regional") return "Geelong";
  return "Ballarat";
}

function weightedPick(pool, count, randomFn) {
  const chosen = [];
  const remaining = [...pool];

  while (remaining.length && chosen.length < count) {
    const totalWeight = remaining.reduce((sum, item) => sum + Math.max(item.score, 0.001), 0);
    let roll = randomFn() * totalWeight;
    let pickedIndex = 0;

    for (let i = 0; i < remaining.length; i += 1) {
      roll -= Math.max(remaining[i].score, 0.001);
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }

    chosen.push(remaining[pickedIndex]);
    remaining.splice(pickedIndex, 1);
  }

  return chosen;
}

function percentileQualityScore(rankingBand, randomFn) {
  const bandToRange = {
    "Top 5%": [0.95, 0.995],
    "Top 10%": [0.9, 0.95],
    "Top 20%": [0.8, 0.9],
    "Top 50%": [0.5, 0.8],
  };
  const [min, max] = bandToRange[rankingBand] || bandToRange["Top 10%"];
  return min + (max - min) * randomFn();
}

function buildServiceCatalog() {
  const maxCapacity = Math.max(
    ...state.servicePositions.services.map((service) => service.annualPositions1600Model),
  );

  const catalog = state.servicePositions.services.map((service) => {
    const matchedPrograms = state.programs.filter((program) => {
      const programName = canonicalize(program.healthService);
      const serviceName = canonicalize(service.serviceName);
      return (
        programName === serviceName ||
        programName.includes(serviceName) ||
        serviceName.includes(programName) ||
        programName.split(" ").some((token) => token.length > 4 && serviceName.includes(token))
      );
    });

    const representativeProgram = matchedPrograms[0] || null;
    const hub = deriveServiceHub(service.serviceName, service.directoryRegion);

    return {
      serviceName: service.serviceName,
      label: representativeProgram?.label || service.serviceName,
      region: service.directoryRegion,
      hub,
      capacity: service.annualPositions1600Model,
      sizeScore: service.annualPositions1600Model / maxCapacity,
      matchedPrograms,
      benchmark:
        state.preferenceBaseline?.knownBenchmarks?.find((item) =>
          canonicalize(item.serviceName).includes(canonicalize(service.serviceName).split(" ")[0]),
        ) || null,
    };
  });

  state.serviceCatalog = catalog.filter((item) => item.capacity > 0);
}

function campusProximityScore(candidateHub, serviceHub) {
  if (!candidateHub || !serviceHub) return 0.35;
  const order = getCampusHubOrder(candidateHub);
  const index = order.indexOf(serviceHub);
  if (index === 0) return 1;
  if (index > 0) return clamp(0.88 - index * 0.16, 0.25, 0.88);
  return 0.15;
}

function scoreServiceForPreference(candidate, service, randomFn) {
  const model =
    candidate.priorityGroup === "Group 1"
      ? state.preferenceBaseline.preferenceModel.priorityGroup1
      : state.preferenceBaseline.preferenceModel.priorityGroup2;
  const weights = model.scoreWeights;
  const proximity = campusProximityScore(candidate.campusHub, service.hub);
  const metroBias =
    service.region === "Metro"
      ? 1
      : candidate.priorityGroup === "Group 1"
        ? 0.15
        : 0.55;
  const regionalRuralOpenness = service.region === "Metro" ? 0.2 : 1;
  const randomness = randomFn();

  return (
    proximity * (weights.campusProximity || 0) +
    metroBias * (weights.metroBias || 0) +
    regionalRuralOpenness * (weights.regionalRuralOpenness || 0) +
    service.sizeScore * (weights.serviceSize || 0) +
    randomness * (weights.randomness || 0)
  );
}

function createPreferences(candidate, serviceCatalog, randomFn) {
  const scored = serviceCatalog
    .map((service) => ({
      serviceName: service.serviceName,
      label: service.label,
      region: service.region,
      hub: service.hub,
      score: scoreServiceForPreference(candidate, service, randomFn),
    }))
    .sort((a, b) => b.score - a.score);

  const mix =
    candidate.priorityGroup === "Group 1"
      ? state.preferenceBaseline.preferenceModel.priorityGroup1.targetMixAcrossSixPreferences
      : state.preferenceBaseline.preferenceModel.priorityGroup2.targetMixAcrossSixPreferences;

  const metroPool = scored.filter((item) => item.region === "Metro").slice(0, 24);
  const nonMetroPool = scored.filter((item) => item.region !== "Metro").slice(0, 24);

  const selected = [
    ...weightedPick(metroPool, mix.metro, randomFn),
    ...weightedPick(nonMetroPool, mix.regionalOrRural, randomFn),
  ];

  const seen = new Set(selected.map((item) => item.serviceName));
  for (const service of scored) {
    if (selected.length >= 6) break;
    if (!seen.has(service.serviceName)) {
      selected.push(service);
      seen.add(service.serviceName);
    }
  }

  return selected
    .slice(0, 6)
    .sort((a, b) => b.score + randomFn() * 0.08 - (a.score + randomFn() * 0.08))
    .map((item) => item.serviceName);
}

function createCandidatePool(randomFn) {
  const totalPmcvCandidates =
    state.simulationConfig.totalCandidates - state.simulationConfig.privateWithdrawalCount;
  const campuses = state.campusBaseline.campuses;
  const totalCampusStudents = campuses.reduce((sum, campus) => sum + campus.students, 0);
  const candidates = [];
  let generated = 0;

  campuses.forEach((campus, index) => {
    const exactShare = (campus.students / totalCampusStudents) * totalPmcvCandidates;
    const campusCount =
      index === campuses.length - 1 ? totalPmcvCandidates - generated : Math.round(exactShare);
    generated += campusCount;

    for (let i = 0; i < campusCount; i += 1) {
      const priorityGroup =
        i < Math.round(campusCount * (state.simulationConfig.priorityGroup1Percent / 100))
          ? "Group 1"
          : "Group 2";
      const qualityScore =
        0.35 +
        randomFn() * 0.55 +
        (priorityGroup === "Group 1" ? 0.04 : 0);

      candidates.push({
        id: `candidate-${candidates.length + 1}`,
        campus: campus.campus,
        campusHub: campus.hub,
        provider: campus.provider,
        priorityGroup,
        qualityScore: clamp(qualityScore, 0, 0.995),
        preferences: [],
      });
    }
  });

  candidates.forEach((candidate) => {
    candidate.preferences = createPreferences(candidate, state.serviceCatalog, randomFn);
  });

  return candidates;
}

function buildCurrentCandidate(randomFn) {
  const snapshot = getFormSnapshot();
  return {
    id: "current-candidate",
    campus: "Manual scenario candidate",
    campusHub: "Inner Metro",
    provider: "Manual",
    priorityGroup: snapshot.priorityGroup,
    qualityScore: percentileQualityScore(snapshot.rankingBand, randomFn),
    preferences: snapshot.preferences
      .map((preference) => {
        const program = findProgram(preference);
        if (!program) return preference;
        const matchedService = state.serviceCatalog.find((service) => {
          const programName = canonicalize(program.healthService);
          const serviceName = canonicalize(service.serviceName);
          return (
            programName === serviceName ||
            serviceName.includes(programName) ||
            programName.includes(serviceName) ||
            programName.split(" ").some((token) => token.length > 4 && serviceName.includes(token))
          );
        });
        return matchedService?.serviceName || program.healthService;
      })
      .filter(Boolean),
  };
}

function rankCandidatesForService(service, candidates, randomFn) {
  const applicantScores = [];
  const benchmark = state.preferenceBaseline.knownBenchmarks.find((item) =>
    canonicalize(item.serviceName).includes(canonicalize(service.serviceName).split(" ")[0]),
  );
  const competitivenessBoost = benchmark ? 0.18 : service.region === "Metro" ? 0.08 : 0.04;

  candidates.forEach((candidate) => {
    const preferenceIndex = candidate.preferences.indexOf(service.serviceName);
    if (preferenceIndex === -1) return;

    const proximity = campusProximityScore(candidate.campusHub, service.hub);
    const score =
      candidate.qualityScore * (1 + competitivenessBoost) +
      proximity * 0.35 +
      (6 - preferenceIndex) * 0.01 +
      randomFn() * 0.03;

    applicantScores.push({ candidateId: candidate.id, score });
  });

  applicantScores.sort((a, b) => b.score - a.score);
  return applicantScores.map((item) => item.candidateId);
}

function runDeferredAllocation(candidates, serviceCatalog, randomFn) {
  const eligibleCandidates = candidates;
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const serviceRankings = new Map();
  const serviceTentatives = new Map();
  const nextPreferenceIndex = new Map();

  serviceCatalog.forEach((service) => {
    serviceRankings.set(
      service.serviceName,
      rankCandidatesForService(service, eligibleCandidates, randomFn),
    );
    serviceTentatives.set(service.serviceName, []);
  });

  eligibleCandidates.forEach((candidate) => nextPreferenceIndex.set(candidate.id, 0));

  let active = eligibleCandidates.map((candidate) => candidate.id);

  while (active.length) {
    const applications = new Map();
    const nextActive = [];

    active.forEach((candidateId) => {
      const candidate = byId.get(candidateId);
      const prefIndex = nextPreferenceIndex.get(candidateId) || 0;
      const target = candidate.preferences[prefIndex];
      if (!target) return;

      nextPreferenceIndex.set(candidateId, prefIndex + 1);
      if (!applications.has(target)) applications.set(target, []);
      applications.get(target).push(candidateId);
    });

    applications.forEach((candidateIds, serviceName) => {
      const service = serviceCatalog.find((item) => item.serviceName === serviceName);
      if (!service) return;

      const ranking = serviceRankings.get(serviceName) || [];
      const current = serviceTentatives.get(serviceName) || [];
      const combined = [...new Set([...current, ...candidateIds])];
      combined.sort((a, b) => ranking.indexOf(a) - ranking.indexOf(b));

      const accepted = combined.slice(0, service.capacity);
      const rejected = combined.slice(service.capacity);
      serviceTentatives.set(serviceName, accepted);

      rejected.forEach((candidateId) => {
        const candidate = byId.get(candidateId);
        if ((nextPreferenceIndex.get(candidateId) || 0) < candidate.preferences.length) {
          nextActive.push(candidateId);
        }
      });
    });

    active = nextActive;
  }

  const allocations = new Map();
  serviceTentatives.forEach((candidateIds, serviceName) => {
    candidateIds.forEach((candidateId) => allocations.set(candidateId, serviceName));
  });

  return allocations;
}

function runStrictTwoStageAllocation(candidates, serviceCatalog, randomFn) {
  const group1Allocations = runDeferredAllocation(
    candidates.filter((candidate) => candidate.priorityGroup === "Group 1"),
    serviceCatalog,
    randomFn,
  );
  const remainingCatalog = serviceCatalog.map((service) => {
    const usedByGroup1 = [...group1Allocations.values()].filter(
      (value) => value === service.serviceName,
    ).length;
    return {
      ...service,
      remainingCapacity: Math.max(0, service.capacity - usedByGroup1),
      capacity: Math.max(0, service.capacity - usedByGroup1),
    };
  });
  const group2Allocations = runDeferredAllocation(
    candidates.filter((candidate) => candidate.priorityGroup === "Group 2"),
    remainingCatalog,
    randomFn,
  );

  return {
    allocations: new Map([...group1Allocations, ...group2Allocations]),
    group1Allocations,
    group2Allocations,
    remainingCatalog,
  };
}

function estimateCurrentCandidateMatchProbability(seedInput, trials = 12) {
  let matchedTrials = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const randomFn = createSeededRandom(`${seedInput}-candidate-${trial + 1}`);
    const generatedCandidates = createCandidatePool(randomFn);
    const currentCandidate = buildCurrentCandidate(randomFn);
    const result = runStrictTwoStageAllocation(
      [...generatedCandidates, currentCandidate],
      state.serviceCatalog,
      randomFn,
    );
    if (result.allocations.has(currentCandidate.id)) {
      matchedTrials += 1;
    }
  }

  return matchedTrials / trials;
}

function setSimulationLoading(isLoading) {
  runSimulationButton.disabled = isLoading;
  runSimulationButton.textContent = isLoading ? "Running Simulation..." : "Run Simulation";
}

function runSimulation() {
  const randomFn = createSeededRandom(simulationSeedInput.value);
  if (!state.serviceCatalog.length) buildServiceCatalog();

  const generatedCandidates = createCandidatePool(randomFn);
  const currentCandidate = buildCurrentCandidate(randomFn);
  const allCandidates = [...generatedCandidates, currentCandidate];

  const { allocations, group1Allocations, group2Allocations, remainingCatalog } =
    runStrictTwoStageAllocation(allCandidates, state.serviceCatalog, randomFn);

  const activePoolSize = generatedCandidates.length;
  const matchedCandidates = generatedCandidates.filter((candidate) => allocations.has(candidate.id));
  const matchedCount = matchedCandidates.length;
  const unmatchedCount = activePoolSize - matchedCount;

  const stats = {
    activePoolSize,
    matchedCount,
    unmatchedCount,
    overallMatchRate: matchedCount / activePoolSize,
    group1: generatedCandidates.filter((candidate) => candidate.priorityGroup === "Group 1"),
    group2: generatedCandidates.filter((candidate) => candidate.priorityGroup === "Group 2"),
  };

  const countMatchedInGroup = (groupCandidates) =>
    groupCandidates.filter((candidate) => allocations.has(candidate.id)).length;
  const matchedToPreference = (limit) =>
    matchedCandidates.filter((candidate) => {
      const allocation = allocations.get(candidate.id);
      const prefIndex = candidate.preferences.indexOf(allocation);
      return prefIndex !== -1 && prefIndex < limit;
    }).length;

  const regionCounts = { Metro: 0, Regional: 0, Rural: 0 };
  matchedCandidates.forEach((candidate) => {
    const service = state.serviceCatalog.find((item) => item.serviceName === allocations.get(candidate.id));
    if (service) regionCounts[service.region] += 1;
  });

  const serviceDemand = state.serviceCatalog
    .map((service) => {
      const applicants = generatedCandidates.filter((candidate) =>
        candidate.preferences.includes(service.serviceName),
      ).length;
      const matched = matchedCandidates.filter(
        (candidate) => allocations.get(candidate.id) === service.serviceName,
      ).length;
      return {
        serviceName: service.serviceName,
        applicants,
        capacity: service.capacity,
        matched,
        demandRatio: applicants / Math.max(service.capacity, 1),
      };
    })
    .sort((a, b) => b.demandRatio - a.demandRatio)
    .slice(0, 8);

  const currentCandidateAllocation = allocations.get(currentCandidate.id) || null;
  const currentCandidateRank = currentCandidateAllocation
    ? currentCandidate.preferences.indexOf(currentCandidateAllocation) + 1
    : null;
  const currentCandidateMatchProbability = estimateCurrentCandidateMatchProbability(
    simulationSeedInput.value,
  );

  state.latestSimulation = {
    stats,
    group1Matched: countMatchedInGroup(stats.group1),
    group2Matched: countMatchedInGroup(stats.group2),
    group1AllocationsCount: group1Allocations.size,
    group2AllocationsCount: group2Allocations.size,
    remainingAfterGroup1: remainingCatalog.reduce((sum, service) => sum + service.capacity, 0),
    top1: matchedToPreference(1),
    top3: matchedToPreference(3),
    top6: matchedToPreference(6),
    regionCounts,
    serviceDemand,
    currentCandidate: {
      allocation: currentCandidateAllocation,
      rank: currentCandidateRank,
      rankingBand: getFormSnapshot().rankingBand,
      matched: Boolean(currentCandidateAllocation),
      matchProbability: currentCandidateMatchProbability,
    },
  };

  renderSimulationResults();
}

function runSimulationAsync() {
  setSimulationLoading(true);
  resultGrid.innerHTML = renderStat("Running", "...", "simulation in progress");
  matchOutcomes.innerHTML = "<li>Running simulation...</li>";
  preferenceOutcomes.innerHTML = "<li>Running simulation...</li>";
  regionalOutcomes.innerHTML = "<li>Running simulation...</li>";
  capacityOutcomes.innerHTML = "<li>Running simulation...</li>";
  currentCandidateOutcomes.innerHTML = "<li>Running simulation...</li>";
  currentCandidateBadge.className = "candidate-outcome-badge";
  currentCandidateBadge.textContent = "";
  competitiveServices.innerHTML = "";

  window.setTimeout(() => {
    try {
      runSimulation();
    } finally {
      setSimulationLoading(false);
    }
  }, 20);
}

function renderStat(label, value, subtext = "") {
  return `
    <div class="result-stat">
      <span class="result-stat__label">${label}</span>
      <div class="result-stat__value">${value}</div>
      <div class="result-stat__subtext">${subtext}</div>
    </div>
  `;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderSimulationResults() {
  if (!state.latestSimulation) return;
  const {
    stats,
    group1Matched,
    group2Matched,
    group1AllocationsCount,
    group2AllocationsCount,
    remainingAfterGroup1,
    top1,
    top3,
    top6,
    regionCounts,
    serviceDemand,
    currentCandidate,
  } =
    state.latestSimulation;

  resultGrid.innerHTML = [
    renderStat("Active PMCV Pool", stats.activePoolSize.toLocaleString("en-AU"), "after private-hospital withdrawals"),
    renderStat("Matched", stats.matchedCount.toLocaleString("en-AU"), formatPercent(stats.overallMatchRate)),
    renderStat("Unmatched", stats.unmatchedCount.toLocaleString("en-AU"), "remaining after six preferences"),
    renderStat("Total Positions", state.simulationConfig.totalPositions.toLocaleString("en-AU"), "strict statewide cap"),
  ].join("");

  matchOutcomes.innerHTML = `
    <li>Priority Group 1 matched: ${group1Matched.toLocaleString("en-AU")} of ${stats.group1.length.toLocaleString("en-AU")} (${formatPercent(group1Matched / stats.group1.length)})</li>
    <li>Priority Group 2 matched: ${group2Matched.toLocaleString("en-AU")} of ${stats.group2.length.toLocaleString("en-AU")} (${formatPercent(group2Matched / stats.group2.length)})</li>
    <li>Allocation uses a strict two-stage PMCV rule: Group 1 fills positions first, then Group 2 competes only for leftover capacity.</li>
  `;

  preferenceOutcomes.innerHTML = `
    <li>Matched to first preference: ${top1.toLocaleString("en-AU")} (${formatPercent(top1 / stats.matchedCount)})</li>
    <li>Matched within top 3: ${top3.toLocaleString("en-AU")} (${formatPercent(top3 / stats.matchedCount)})</li>
    <li>Matched within top 6: ${top6.toLocaleString("en-AU")} (${formatPercent(top6 / stats.matchedCount)})</li>
  `;

  regionalOutcomes.innerHTML = `
    <li>Metro matches: ${regionCounts.Metro.toLocaleString("en-AU")}</li>
    <li>Regional matches: ${regionCounts.Regional.toLocaleString("en-AU")}</li>
    <li>Rural matches: ${regionCounts.Rural.toLocaleString("en-AU")}</li>
  `;

  capacityOutcomes.innerHTML = `
    <li>Positions filled by Group 1 stage: ${group1AllocationsCount.toLocaleString("en-AU")}</li>
    <li>Positions left for Group 2 stage: ${remainingAfterGroup1.toLocaleString("en-AU")}</li>
    <li>Positions filled by Group 2 stage: ${group2AllocationsCount.toLocaleString("en-AU")}</li>
  `;

  currentCandidateOutcomes.innerHTML = currentCandidate.allocation
    ? `
      <li>Ranking assumption used: ${currentCandidate.rankingBand}</li>
      <li>Candidate result: Matched</li>
      <li>Likely allocation: ${currentCandidate.allocation}</li>
      <li>Matched at preference rank: ${currentCandidate.rank}</li>
      <li>Estimated match probability: ${(currentCandidate.matchProbability * 100).toFixed(1)}%</li>
    `
    : `
      <li>Ranking assumption used: ${currentCandidate.rankingBand}</li>
      <li>Candidate result: Not matched</li>
      <li>No allocation achieved in this run.</li>
      <li>Estimated match probability: ${(currentCandidate.matchProbability * 100).toFixed(1)}%</li>
      <li>To test this candidate properly, keep at least one preference selected in the form.</li>
    `;

  currentCandidateBadge.className = `candidate-outcome-badge ${
    currentCandidate.matched
      ? "candidate-outcome-badge--matched"
      : "candidate-outcome-badge--unmatched"
  }`;
  currentCandidateBadge.textContent = currentCandidate.matched
    ? `Matched in this run • ${(currentCandidate.matchProbability * 100).toFixed(1)}% estimated chance`
    : `Not matched in this run • ${(currentCandidate.matchProbability * 100).toFixed(1)}% estimated chance`;

  competitiveServices.innerHTML = `
    <div class="result-table__row result-table__row--head">
      <div>Service</div>
      <div>Applicants</div>
      <div>Capacity</div>
      <div>Apps/Pos</div>
    </div>
    ${serviceDemand
      .map(
        (service) => `
          <div class="result-table__row">
            <div>${service.serviceName}</div>
            <div>${service.applicants.toLocaleString("en-AU")}</div>
            <div>${service.capacity.toLocaleString("en-AU")}</div>
            <div>${service.demandRatio.toFixed(1)}</div>
          </div>`,
      )
      .join("")}
  `;
}

function buildPreferenceRows() {
  for (let i = 0; i < 6; i += 1) {
    const fragment = rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".preference-row");
    const index = fragment.querySelector(".preference-row__index");
    const label = fragment.querySelector(".preference-row__label");
    const input = fragment.querySelector(".preference-input");
    const meta = fragment.querySelector(".preference-meta");

    index.textContent = String(i + 1);
    label.textContent = `Preference ${i + 1}`;
    input.name = `preference${i + 1}`;
    input.dataset.index = String(i);
    input.setAttribute("aria-label", `Preference ${i + 1}`);
    input.innerHTML = buildProgramOptions();

    input.addEventListener("change", () => {
      syncPreferenceOptions();
      renderPreferenceMeta(input, meta);
      updateSummary();
      persistForm();
    });

    row.dataset.index = String(i);
    attachDragEvents(row);
    preferenceList.appendChild(fragment);
  }

  refreshPreferenceLabels();
  syncPreferenceOptions();
}

function buildProgramOptions() {
  const optionsMarkup = state.programs
    .map((program) => `<option value="${escapeHtml(program.label)}">${escapeHtml(program.label)}</option>`)
    .join("");
  return `<option value="">Select a PMCV program</option>${optionsMarkup}`;
}

function syncPreferenceOptions() {
  const selects = Array.from(preferenceList.querySelectorAll(".preference-input"));
  const selectedValues = selects.map((select) => select.value).filter(Boolean);

  selects.forEach((select) => {
    const ownValue = select.value;

    Array.from(select.options).forEach((option) => {
      if (!option.value) {
        option.disabled = false;
        return;
      }

      option.disabled = option.value !== ownValue && selectedValues.includes(option.value);
    });
  });
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function findProgram(label) {
  return state.programs.find((program) => program.label === label);
}

function renderPreferenceMeta(input, target) {
  const value = input.value.trim();
  const program = findProgram(value);

  if (!value) {
    target.textContent = "No program selected.";
    return;
  }

  if (!program) {
    target.textContent = "Program not matched yet. Choose an item from the PMCV list.";
    return;
  }

  target.innerHTML = `<strong>${program.region}</strong> • ${program.intakeMonths || "Intake to be confirmed"}`;
}

function refreshPreferenceLabels() {
  preferenceList.querySelectorAll(".preference-row").forEach((row, index) => {
    row.dataset.index = String(index);
    row.querySelector(".preference-row__index").textContent = String(index + 1);
    row.querySelector(".preference-row__label").textContent = `Preference ${index + 1}`;
    const input = row.querySelector(".preference-input");
    input.name = `preference${index + 1}`;
    input.setAttribute("aria-label", `Preference ${index + 1}`);
  });

  syncPreferenceOptions();
}

function attachDragEvents(row) {
  row.addEventListener("dragstart", () => {
    row.classList.add("dragging");
  });

  row.addEventListener("dragend", () => {
    row.classList.remove("dragging");
    preferenceList.querySelectorAll(".preference-row").forEach((item) => {
      item.classList.remove("drag-over");
    });
    refreshPreferenceLabels();
    updateSummary();
    persistForm();
  });

  row.addEventListener("dragover", (event) => {
    event.preventDefault();
    const dragging = preferenceList.querySelector(".dragging");
    if (!dragging || dragging === row) {
      return;
    }

    row.classList.add("drag-over");
    const rowRect = row.getBoundingClientRect();
    const shouldInsertBefore = event.clientY < rowRect.top + rowRect.height / 2;
    preferenceList.insertBefore(dragging, shouldInsertBefore ? row : row.nextElementSibling);
  });

  row.addEventListener("dragleave", () => {
    row.classList.remove("drag-over");
  });

  row.addEventListener("drop", () => {
    row.classList.remove("drag-over");
  });
}

function getFormSnapshot() {
  const candidateName = document.querySelector("#candidate-name").value.trim() || "Test Candidate";
  const priorityGroup =
    form.querySelector('input[name="priorityGroup"]:checked')?.value || "Group 1";
  const rankingBand =
    form.querySelector('input[name="rankingBand"]:checked')?.value || "Top 10%";

  const preferences = Array.from(preferenceList.querySelectorAll(".preference-input"))
    .map((input) => input.value.trim())
    .filter(Boolean);

  return { candidateName, priorityGroup, rankingBand, preferences };
}

function updateSummary() {
  const snapshot = getFormSnapshot();

  summaryName.textContent = snapshot.candidateName;
  summaryPriority.textContent = snapshot.priorityGroup;
  summaryRanking.textContent = snapshot.rankingBand;
  summaryPreferences.innerHTML = "";

  if (!snapshot.preferences.length) {
    const item = document.createElement("li");
    item.textContent = "No preferences entered yet.";
    summaryPreferences.appendChild(item);
    return;
  }

  snapshot.preferences.forEach((preference) => {
    const item = document.createElement("li");
    const program = findProgram(preference);
    item.textContent = program
      ? `${program.healthService} - ${program.stream} (${program.region}${program.intakeMonths ? `, ${program.intakeMonths}` : ""})`
      : preference;
    summaryPreferences.appendChild(item);
  });
}

function persistForm() {
  localStorage.setItem(storageKey, JSON.stringify(getFormSnapshot()));
}

function restoreForm() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    updateAllMeta();
    updateSummary();
    return;
  }

  try {
    const snapshot = JSON.parse(raw);
    document.querySelector("#candidate-name").value = snapshot.candidateName || "";

    const priorityInput = form.querySelector(
      `input[name="priorityGroup"][value="${snapshot.priorityGroup || "Group 1"}"]`,
    );
    if (priorityInput) {
      priorityInput.checked = true;
    }

    const rankingInput = form.querySelector(
      `input[name="rankingBand"][value="${snapshot.rankingBand || "Top 10%"}"]`,
    );
    if (rankingInput) {
      rankingInput.checked = true;
    }

    const inputs = preferenceList.querySelectorAll(".preference-input");
    inputs.forEach((input, index) => {
      input.value = snapshot.preferences?.[index] || "";
    });
  } catch {
    localStorage.removeItem(storageKey);
  }

  syncPreferenceOptions();
  updateAllMeta();
  updateSummary();
}

function updateAllMeta() {
  preferenceList.querySelectorAll(".preference-row").forEach((row) => {
    const input = row.querySelector(".preference-input");
    const meta = row.querySelector(".preference-meta");
    renderPreferenceMeta(input, meta);
  });
}

function clearForm() {
  form.reset();
  document.querySelector("#candidate-name").value = "";
  preferenceList.querySelectorAll(".preference-input").forEach((input) => {
    input.value = "";
  });
  localStorage.removeItem(storageKey);
  syncPreferenceOptions();
  updateAllMeta();
  updateSummary();
}

function loadMentalHealthExample() {
  const mentalHealthPrograms = state.programs.filter((program) =>
    program.stream.toLowerCase().includes("mental health"),
  );
  const inputs = preferenceList.querySelectorAll(".preference-input");

  inputs.forEach((input, index) => {
    input.value = mentalHealthPrograms[index]?.label || "";
  });

  syncPreferenceOptions();
  updateAllMeta();
  updateSummary();
  persistForm();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  persistForm();
  updateSummary();
});

form.addEventListener("change", () => {
  updateSummary();
  persistForm();
});

clearButton.addEventListener("click", clearForm);
fillMentalHealthButton.addEventListener("click", loadMentalHealthExample);
runSimulationButton.addEventListener("click", runSimulationAsync);

buildServiceCatalog();
buildPreferenceRows();
renderCandidateBaseline();
renderPositionBaseline();
renderCampusBaseline();
renderAlgorithmBaseline();
renderBenchmarkBaseline();
if (!state.programs.length) {
  summaryPreferences.innerHTML = "<li>PMCV program data could not be loaded.</li>";
} else {
  restoreForm();
}
