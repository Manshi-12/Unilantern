export interface GetCollegesDto {
    search?: string;  // filter by college name (partial, case-insensitive)
    page?: number;    // default: 1
    limit?: number;   // default: 20, max: 100
  }




