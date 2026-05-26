export interface College {

  college_id: number

  college_name: string

  college_logo_url:
    string | null

  state:
    string | null

  college_type:
    string | null

  acceptance_rate:
    number | null

  is_public: boolean
}