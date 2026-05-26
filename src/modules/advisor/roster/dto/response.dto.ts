import type {
    PriorityStudent,
    RosterStudent,
  } from '../roster.types.js'
  
  export interface RosterResponseDto {
    students: RosterStudent[]
  
    meta: {
      total: number
      page: number
      limit: number
      total_pages: number
    }
  }
  
  export interface PriorityQueueResponseDto {
    students: PriorityStudent[]
  }
  
  export interface RosterFiltersResponseDto {
    readiness_bands: string[]
  
    flags: {
      key: string
      label: string
    }[]
  }