// A student's school is mandatory, but a few students genuinely have none
// (not in school, home-schooled, already graduated...). Forcing a made-up
// school name for them would pollute the data, so this one fixed value
// stands for "no school / other" and still satisfies the rule.
export const SCHOOL_NONE = "Non scolarisé / autre";
