window.PMCV_SIMULATION_CONFIG = {
  candidateModel: {
    totalCandidates: 4500,
    priorityGroup1Share: 0.7,
    priorityGroup2Share: 0.3,
    applyShareEvenlyAcrossCampuses: true,
  },
  preferenceModel: {
    priorityGroup1: {
      description:
        "Domestic / Group 1 candidates strongly prefer metro hospitals and usually keep one regional or rural backup.",
      targetMixAcrossSixPreferences: {
        metro: 5,
        regionalOrRural: 1,
      },
      scoreWeights: {
        campusProximity: 0.4,
        metroBias: 0.3,
        serviceSize: 0.2,
        randomness: 0.1,
      },
    },
    priorityGroup2: {
      description:
        "International / Group 2 candidates are still metro-aware but more balanced between metro and regional / rural services.",
      targetMixAcrossSixPreferences: {
        metro: 3,
        regionalOrRural: 3,
      },
      scoreWeights: {
        campusProximity: 0.35,
        metroBias: 0.15,
        regionalRuralOpenness: 0.2,
        serviceSize: 0.2,
        randomness: 0.1,
      },
    },
  },
  locationModel: {
    description:
      "Health services should be scored higher when they are in the same broad hub or a neighbouring hub to the candidate's campus.",
    campusHubAffinity: {
      "North Metro": ["North Metro", "Parkville", "Inner Metro", "East Metro", "West Metro"],
      "West Metro": ["West Metro", "Inner Metro", "North Metro", "Bayside / South Metro", "Geelong"],
      "East Metro": ["East Metro", "Inner Metro", "Parkville", "South East Metro", "North Metro"],
      "Outer East Metro": ["Outer East Metro", "East Metro", "South East Metro", "Inner Metro"],
      "South East Metro": ["South East Metro", "Bayside / South Metro", "Frankston / Peninsula", "Inner Metro", "East Metro"],
      "Bayside / South Metro": ["Bayside / South Metro", "South East Metro", "Inner Metro", "Frankston / Peninsula"],
      "Frankston / Peninsula": ["Frankston / Peninsula", "Bayside / South Metro", "South East Metro", "Geelong"],
      "Inner Metro": ["Inner Metro", "Parkville", "North Metro", "East Metro", "West Metro", "South East Metro"],
      "Parkville": ["Parkville", "Inner Metro", "North Metro", "East Metro", "West Metro"],
      Geelong: ["Geelong", "West Metro", "Warrnambool", "Ballarat"],
      Ballarat: ["Ballarat", "West Metro", "Geelong", "Bendigo"],
      Bendigo: ["Bendigo", "Ballarat", "Shepparton", "Mildura"],
      Shepparton: ["Shepparton", "Albury-Wodonga", "Bendigo"],
      "Albury-Wodonga": ["Albury-Wodonga", "Shepparton"],
      Mildura: ["Mildura", "Bendigo"],
      Gippsland: ["Gippsland", "Frankston / Peninsula", "South East Metro"],
      Warrnambool: ["Warrnambool", "Geelong", "Ballarat"],
    },
  },
  notes: [
    "Candidate home campus is sampled from the statewide campus distribution.",
    "The 70/30 Group 1 / Group 2 split is applied evenly within each campus.",
    "Preference generation should combine campus proximity, metro / non-metro bias, and health service size.",
    "Health service location should matter before final randomness is applied.",
  ],
  knownBenchmarks: [
    {
      serviceName: "West Gippsland Healthcare Group (Warragul Hospital)",
      serviceType: "Regional",
      annualPositionsKnown: 22,
      applicationsKnown: 500,
      applicationsPerPosition: 22.73,
      notes:
        "User-provided 2026 benchmark. High regional demand despite non-metro setting.",
    },
    {
      serviceName: "The Royal Children's Hospital",
      serviceType: "Metro",
      applicationsKnownLowerBound: 600,
      interviewsEstimatedRange: [150, 160],
      offersEstimatedRange: [40, 50],
      impliedInterviewRateRange: [0.25, 0.267],
      impliedOfferRateRange: [0.067, 0.083],
      notes:
        "User-provided 2026 benchmark. Strong metro demand and clear interview funnel.",
    },
  ],
};
