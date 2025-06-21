// Define the activity progression flow
export const ACTIVITY_PROGRESSION: { [key: string]: string } = {
  Fresh: "Attempting to make contact with lead",
  "Attempting to make contact with lead": "Quotation Email Sent", // Updated to skip response checking for now
  "Quotation Email Sent": "Questionnaire Sent",
  "Questionnaire Sent": "Questionnaire Chasing",
  "Questionnaire Chasing": "Questionnaire Final Chase",
  "Questionnaire Final Chase": "Questionnaire Received, Awaiting Assessment",
  "Questionnaire Received, Awaiting Assessment": "Informal Quote Given, Awaiting Response",
  "Informal Quote Given, Awaiting Response": "Quote Given, Awaiting Response",
  "Quote Given, Awaiting Response": "Awaiting Client Instruction",
  "Awaiting Client Instruction": "Details Passed To Relevant People For Contact",
  "Details Passed To Relevant People For Contact": "See Case Notes",
}

// Define the recommended next actions for each activity
export const ACTIVITY_NEXT_ACTIONS: { [key: string]: string } = {
  Fresh: "Send an introductory email to make first contact",
  "Attempting to make contact with lead": "Send a quotation email with questionnaire",
  "Quotation Email Sent": "Monitor for response and follow up if needed",
  "Questionnaire Sent": "Set reminder to follow up on questionnaire response",
  "Questionnaire Chasing": "Send follow-up email about the questionnaire",
  "Questionnaire Final Chase": "Make final attempt to get questionnaire response",
  "Questionnaire Received, Awaiting Assessment": "Review and assess the questionnaire responses",
  "Informal Quote Given, Awaiting Response": "Monitor for response to the informal quote",
  "Quote Given, Awaiting Response": "Follow up on the formal quote response",
  "Awaiting Client Instruction": "Wait for client to provide further instructions",
  "Details Passed To Relevant People For Contact": "Ensure relevant team has contacted the lead",
  "See Case Notes": "Review case notes for current status and next steps",
}

// Define action questions to ask the user
export const ACTIVITY_ACTION_QUESTIONS: { [key: string]: string } = {
  Fresh: "Should I send an introductory email to this lead?",
  "Attempting to make contact with lead": "Should I send a quotation email with questionnaire to this lead?",
  "Quotation Email Sent": "Should I monitor for their response to the quotation email?",
  "Questionnaire Sent": "Should I set a reminder to follow up on the questionnaire in a few days?",
  "Questionnaire Chasing": "Should I send a follow-up email to chase the questionnaire response?",
  "Questionnaire Final Chase": "Should I make a final attempt to get the questionnaire response?",
  "Questionnaire Received, Awaiting Assessment": "Should I review and assess the questionnaire responses now?",
  "Informal Quote Given, Awaiting Response": "Should I monitor for their response to the informal quote?",
  "Quote Given, Awaiting Response": "Should I set up follow-up for the formal quote response?",
  "Awaiting Client Instruction": "Should I wait for the client to provide further instructions?",
  "Details Passed To Relevant People For Contact": "Should I check if the relevant team has contacted this lead?",
  "See Case Notes": "Should I review the case notes to determine the next steps?",
}

// Get the next activity in the progression
export function getNextActivity(currentActivity: string): string | null {
  return ACTIVITY_PROGRESSION[currentActivity] || null
}

// Get the recommended next action for an activity
export function getNextActionForActivity(activity: string): string | null {
  return ACTIVITY_NEXT_ACTIONS[activity] || null
}

// Get the action question to ask the user
export function getActionQuestionForActivity(activity: string): string | null {
  return ACTIVITY_ACTION_QUESTIONS[activity] || null
}

// Get a human-readable description of what the activity means
export function getActivityDescription(activity: string): string {
  const descriptions: { [key: string]: string } = {
    Fresh: "New lead that hasn't been contacted yet",
    "Attempting to make contact with lead": "Actively trying to reach the lead",
    "Quotation Email Sent": "Quotation email with questionnaire has been sent",
    "Questionnaire Sent": "Initial questionnaire has been sent to the lead",
    "Questionnaire Chasing": "Following up on the sent questionnaire",
    "Questionnaire Final Chase": "Final attempt to get questionnaire response",
    "Questionnaire Received, Awaiting Assessment": "Questionnaire received, being reviewed",
    "Informal Quote Given, Awaiting Response": "Initial quote provided, waiting for response",
    "Quote Given, Awaiting Response": "Formal quote provided, waiting for response",
    "Awaiting Client Instruction": "Waiting for client to provide further instructions",
    "Details Passed To Relevant People For Contact": "Lead details forwarded to appropriate team",
    "See Case Notes": "Refer to case notes for current status",
  }

  return descriptions[activity] || activity
}

// Check if an activity can be progressed
export function canProgressActivity(currentActivity: string): boolean {
  return currentActivity in ACTIVITY_PROGRESSION
}
