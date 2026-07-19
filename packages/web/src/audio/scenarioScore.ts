export type ScenarioScoreTrack = {
  id: string;
  title: string;
  url: string;
  durationSeconds: number;
  sourceDownloads: string[];
  sourceSha256: string;
};

/**
 * The complete unique SECTOR 305 scenario-score catalog.
 *
 * Nineteen source downloads resolve to seventeen unique masters. Exact-copy
 * aliases remain documented in sourceDownloads without weighting the same
 * composition twice in the watch rotation.
 */
export const SCENARIO_SCORE_TRACKS: readonly ScenarioScoreTrack[] = [
  {
    id: "collins-alert",
    title: "Collins Alert",
    url: "/audio/scenarios/collins-alert.mp3",
    durationSeconds: 163.15,
    sourceDownloads: ["Collins Alert.wav"],
    sourceSha256: "86D915B4991DD9E67C7427FF30623DFFC6312B80C604A31EB94106999688822B",
  },
  {
    id: "south-beach-pursuit",
    title: "South Beach Pursuit",
    url: "/audio/scenarios/south-beach-pursuit.mp3",
    durationSeconds: 162.6,
    sourceDownloads: ["South Beach Pursuit.wav"],
    sourceSha256: "7ABB55F1275AD8D05FB8CA8ADA0B291E159D552292462CB93BD5253B9E3A4E27",
  },
  {
    id: "south-beach-alarm",
    title: "South Beach Alarm",
    url: "/audio/scenarios/south-beach-alarm.mp3",
    durationSeconds: 86.28,
    sourceDownloads: ["South Beach Alarm.wav"],
    sourceSha256: "03A7DCE34EBF0ABE8C26257E7260BFE6E130F14539E79FBE94991916755AF989",
  },
  {
    id: "mister-three-oh-five",
    title: "Mister Three Oh Five",
    url: "/audio/scenarios/mister-three-oh-five.mp3",
    durationSeconds: 137.4,
    sourceDownloads: ["Mister Three Oh Five.wav"],
    sourceSha256: "0C0BD8B488840E685F152DBD32EAD01DB44DCE28A91A6FB128DC1D2304AC4232",
  },
  {
    id: "miami-cipher",
    title: "Miami Cipher",
    url: "/audio/scenarios/miami-cipher.mp3",
    durationSeconds: 142.4,
    sourceDownloads: ["Miami Cipher.wav"],
    sourceSha256: "FDAC4D598B0B456E0FD2AD13A88F006B345927CBF5E1D91C041943093F0179D6",
  },
  {
    id: "vice-grid",
    title: "Vice Grid",
    url: "/audio/scenarios/vice-grid.mp3",
    durationSeconds: 122.88,
    sourceDownloads: ["Vice Grid.wav"],
    sourceSha256: "C50D097BBE3CD204CAA0C996D2F4D1881E9DE50D3D6DC2E2A6924C240EEDAFB8",
  },
  {
    id: "chopper-run",
    title: "Chopper Run",
    url: "/audio/scenarios/chopper-run.mp3",
    durationSeconds: 128.12,
    sourceDownloads: ["Chopper Run.wav", "Chopper Run (1).wav"],
    sourceSha256: "2F60B137672B46626C315E8122AA9352A93C64EC06CE4B0B27DB385C76E272AE",
  },
  {
    id: "gloria-bay",
    title: "Gloria Bay",
    url: "/audio/scenarios/gloria-bay.mp3",
    durationSeconds: 107.93,
    sourceDownloads: ["Gloria Bay.wav"],
    sourceSha256: "6546A7782FC4176295A8C481E2DD0534868145B92EEC53790DA910D5A00B78EE",
  },
  {
    id: "calle-ocho-alarm",
    title: "Calle Ocho Alarm",
    url: "/audio/scenarios/calle-ocho-alarm.mp3",
    durationSeconds: 143,
    sourceDownloads: ["Calle Ocho Alarm.wav"],
    sourceSha256: "A31CE9BE6F8624F2E1049EC2C719EDF29FE574A5AD700A08BC7CAC3314FE97FB",
  },
  {
    id: "mayday-over-miami",
    title: "Mayday Over Miami",
    url: "/audio/scenarios/mayday-over-miami.mp3",
    durationSeconds: 192.32,
    sourceDownloads: ["Mayday Over Miami.wav", "Mayday Over Miami (1).wav"],
    sourceSha256: "24713AE9CD15D028078BAB06B8D94C3C3E017BF8BD2A0627C2EA16B30623E972",
  },
  {
    id: "biscayne-bay-run",
    title: "Biscayne Bay Run",
    url: "/audio/scenarios/biscayne-bay-run.mp3",
    durationSeconds: 77.2,
    sourceDownloads: ["Biscayne Bay Run.wav"],
    sourceSha256: "7260077E3D7712E60D7588E6E62660A82069A262D3F25FA0AB046D91627A9E07",
  },
  {
    id: "biscayne-bay-alert",
    title: "Biscayne Bay Alert",
    url: "/audio/scenarios/biscayne-bay-alert.mp3",
    durationSeconds: 176.6,
    sourceDownloads: ["Biscayne Bay Alert.wav"],
    sourceSha256: "8DEE9B291DE7696F90591B30D5E260C8DB43197073E42DE907D920A2DE7A3648",
  },
  {
    id: "miami-command-grid",
    title: "Miami Command Grid",
    url: "/audio/scenarios/miami-command-grid.mp3",
    durationSeconds: 171.68,
    sourceDownloads: ["Miami Command Grid.wav"],
    sourceSha256: "56FDAD28EAF795F3660F002396B0D0F2A7E725463A6A04C12E6DE9481C00A089",
  },
  {
    id: "miami-fog-command",
    title: "Miami Fog Command",
    url: "/audio/scenarios/miami-fog-command.mp3",
    durationSeconds: 165,
    sourceDownloads: ["Miami Fog Command.wav"],
    sourceSha256: "0865A8F1BF27B9B4AC2760A447DD0A1924D85FA735EAF0B474F3D178E252568F",
  },
  {
    id: "miami-grid",
    title: "Miami Grid",
    url: "/audio/scenarios/miami-grid.mp3",
    durationSeconds: 164.56,
    sourceDownloads: ["Miami Grid.wav"],
    sourceSha256: "5A18EBBB81BEFFC99D9FA3B3EAA1AF9A80681DBA3B888BAE209BC53E6AEA1D31",
  },
  {
    id: "miami-grid-1",
    title: "Miami Grid I",
    url: "/audio/scenarios/miami-grid-1.mp3",
    durationSeconds: 209.4,
    sourceDownloads: ["Miami Grid (1).wav"],
    sourceSha256: "AA668CF083CA9EED8637F818EB2942598C13C89205B5FF223B3CF885B497291B",
  },
  {
    id: "miami-grid-2",
    title: "Miami Grid II",
    url: "/audio/scenarios/miami-grid-2.mp3",
    durationSeconds: 355,
    sourceDownloads: ["Miami Grid (2).wav"],
    sourceSha256: "3935469448773DF86B10B2B2B1A5324A7A425AF0331A81F493E519DE7EFB07B9",
  },
] as const;

export function scenarioScoreAt(seed: number, cursor: number): ScenarioScoreTrack {
  const size = SCENARIO_SCORE_TRACKS.length;
  const safeSeed = Number.isFinite(seed) ? Math.abs(Math.trunc(seed)) : 0;
  const safeCursor = Number.isFinite(cursor) ? Math.max(0, Math.trunc(cursor)) : 0;
  return SCENARIO_SCORE_TRACKS[(safeSeed + safeCursor) % size];
}
