export interface Scholarship {
    scholarship_id: number
    scholarship_name: string
    provider: string | null
    college_id: number | null
    eligibility_summary: string | null
    deadline: Date | null
    award_amount: string | null
    application_link: string | null
    scholarship_type: string | null
    applicable_grad_years: string | null
  }
  
  export interface FlaggedScholarship {
    flag_id: number
    advisor_id: number
    student_id: number
    scholarship_id: number
    note: string | null
    flagged_at: Date
  
    scholarship: Scholarship
  }