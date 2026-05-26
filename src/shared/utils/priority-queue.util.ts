import type {
    PriorityLabel,
    PriorityStudent,
    RosterStudent,
  } from '../../modules/advisor/roster/roster.types.js'

  interface ScoredStudent {
    student: RosterStudent
    score: number
    flags: string[]
  }

  const calculatePriorityScore = (
    student: RosterStudent,
  ): ScoredStudent => {

    let score = 0

    const flags: string[] = []

    if (student.trend === '↓') {
      score += 40
      flags.push('Readiness declining')
    }

    if (student.trend === '→') {
      score += 20
      flags.push('No recent progress')
    }

    if (student.saved_colleges >= 3) {
      score += 20
      flags.push('High reach college activity')
    }

    if (
      student.readiness_band === 'foundational' ||
      student.readiness_band === 'developing'
    ) {
      score += 35
      flags.push('Needs intervention')
    }

    if (student.primary_gap) {
      score += 15
      flags.push(student.primary_gap)
    }

    if (student.low_engagement) {
      score += 25
      flags.push('Low engagement')
    }

    return {
      student,
      score,
      flags,
    }
  }

  const getPriorityLabel = (
    score: number,
  ): PriorityLabel => {

    if (score >= 70) {
      return 'Urgent'
    }

    if (score >= 40) {
      return 'Needs Review'
    }

    return 'Monitor'
  }

  export const buildPriorityQueue = (
    students: RosterStudent[],
  ): PriorityStudent[] => {

    return students
      .map(calculatePriorityScore)

      .sort((a, b) =>
        b.score - a.score
      )

      .map(({ student, score, flags }) => ({
        student_id: student.student_id,
        full_name: student.full_name,
        readiness_band: student.readiness_band,
        priority_label: getPriorityLabel(score),
        flags,
      }))
  }