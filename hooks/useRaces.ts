import { useQuery } from "@tanstack/react-query";

const DONDE_CORRER_API = "https://ar-api.dondecorrer.com/api/services/app/Races/SearchRaces";
const URUGUAY_COUNTRY_ID = 3;

export interface Race {
  id: number;
  rac_Name: string;
  rac_Date: string;
  rac_SourceLink: string | null;
  rac_Night: boolean;
  raceDistances: {
    id: number;
    distance: {
      dis_Name: string;
      dis_Meters: number;
    };
  }[];
  locality: {
    loc_Name: string;
    state: {
      sta_Name: string;
    };
  };
  sport: {
    spo_Name: string;
  };
  organizer: {
    org_Name: string;
  } | null;
}

interface SearchRacesResponse {
  result: {
    totalCount: number;
    items: Race[];
  };
}

async function fetchRaces(limit: number = 50): Promise<Race[]> {
  const response = await fetch(DONDE_CORRER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json-patch+json",
      Accept: "text/plain",
    },
    body: JSON.stringify({
      cou_Id: [URUGUAY_COUNTRY_ID],
      includeUpcoming: true,
      includeFinished: false,
      myRacesOnly: false,
      rac_Highlighted: false,
      sorting: "Date",
      skipCount: 0,
      maxResultCount: limit,
    }),
  });

  if (!response.ok) {
    throw new Error("Error al cargar las carreras");
  }

  const data: SearchRacesResponse = await response.json();
  return data.result.items;
}

export function useRaces(limit: number = 50) {
  return useQuery({
    queryKey: ["races", "uruguay", limit],
    queryFn: () => fetchRaces(limit),
    staleTime: 1000 * 60 * 60, // 1 hour - races don't change frequently
  });
}

export function useUpcomingRaces(limit: number = 5) {
  return useQuery({
    queryKey: ["races", "uruguay", "upcoming", limit],
    queryFn: () => fetchRaces(limit),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

// Helper functions
export function formatRaceDistances(race: Race): string {
  if (!race.raceDistances || race.raceDistances.length === 0) {
    return "-";
  }
  return race.raceDistances
    .map((rd) => rd.distance.dis_Name)
    .sort((a, b) => {
      // Sort by distance (extract number from string like "7k", "15k", "42k")
      const numA = parseInt(a.replace(/\D/g, "")) || 0;
      const numB = parseInt(b.replace(/\D/g, "")) || 0;
      return numA - numB;
    })
    .join(" | ");
}

export function formatRaceLocation(race: Race): string {
  if (!race.locality) return "-";
  return `${race.locality.loc_Name}, ${race.locality.state.sta_Name}`;
}
