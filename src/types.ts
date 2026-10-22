export type Launch = {
  id: string
  missionName: string
  rocketName: string
  rocketId: string
  dateUtc: string
  details: string | null
  thumbnailUrl: string | null
}

export type LaunchQueryResult = {
  docs: Launch[]
  totalDocs: number
  page: number
  hasNextPage: boolean
}

export type Rocket = {
  id: string
  name: string
}
