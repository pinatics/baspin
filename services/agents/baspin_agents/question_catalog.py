DEPARTMENT_QUESTION_CATALOG: dict[str, list[dict[str, str]]] = {
    "claims operations": [
        {
            "text": "Which claim types are candidates for automatic approval?",
            "priority": "CRITICAL",
            "rationale": "Defines the population that can enter the automated decision path.",
            "expected_owner": "Claims Operations Owner",
        },
        {
            "text": "Which claim types must always receive manual review?",
            "priority": "CRITICAL",
            "rationale": "Identifies mandatory exclusions from automation.",
            "expected_owner": "Claims Operations Owner",
        },
        {
            "text": "What claim amount can be approved automatically?",
            "priority": "CRITICAL",
            "rationale": "Establishes the operational approval threshold.",
            "expected_owner": "Claims Operations Owner",
        },
        {
            "text": "Which conditions require supervisor approval?",
            "priority": "HIGH",
            "rationale": "Captures escalation rules and authority boundaries.",
            "expected_owner": "Claims Operations Owner",
        },
        {
            "text": "Which claim data must be present before a decision can be made?",
            "priority": "HIGH",
            "rationale": "Defines minimum decision-input completeness.",
            "expected_owner": "Claims Operations Owner",
        },
        {
            "text": "Which existing SOP, policy, or procedure is authoritative for these rules?",
            "priority": "HIGH",
            "rationale": "Links operational answers to controlled company evidence.",
            "expected_owner": "Claims Operations Owner",
        },
    ],
    "fraud": [
        {
            "text": "Which fraud indicators should block automatic approval?",
            "priority": "CRITICAL",
            "rationale": "Defines blocking risk controls.",
            "expected_owner": "Fraud / SIU Owner",
        },
        {
            "text": "Which signals require manual review rather than rejection?",
            "priority": "CRITICAL",
            "rationale": "Separates escalation from denial logic.",
            "expected_owner": "Fraud / SIU Owner",
        },
        {
            "text": "Are there existing fraud scores or thresholds used in production?",
            "priority": "HIGH",
            "rationale": "Identifies currently operating risk decision rules.",
            "expected_owner": "Fraud / SIU Owner",
        },
        {
            "text": "What should happen if the fraud service is unavailable?",
            "priority": "HIGH",
            "rationale": "Defines safe fallback behavior.",
            "expected_owner": "Fraud / SIU Owner",
        },
    ],
    "finance": [
        {
            "text": "What payment value can be released without additional Finance authorization?",
            "priority": "CRITICAL",
            "rationale": "Defines the financial authorization boundary.",
            "expected_owner": "Finance Operations Owner",
        },
        {
            "text": "Are payment authorization thresholds different from claim approval thresholds?",
            "priority": "CRITICAL",
            "rationale": "Prevents claim approval and payment release from being incorrectly merged.",
            "expected_owner": "Finance Operations Owner",
        },
        {
            "text": "Which financial controls must complete before payment release?",
            "priority": "HIGH",
            "rationale": "Captures mandatory controls before funds move.",
            "expected_owner": "Finance Operations Owner",
        },
        {
            "text": "Which financial records must be retained for audit?",
            "priority": "MEDIUM",
            "rationale": "Defines financial audit evidence requirements.",
            "expected_owner": "Finance Operations Owner",
        },
    ],
    "legal": [
        {
            "text": "Which automated claim decisions require human review for legal reasons?",
            "priority": "CRITICAL",
            "rationale": "Defines legal limits on automation.",
            "expected_owner": "Legal Counsel",
        },
        {
            "text": "What decision evidence must be retained for automated decisions?",
            "priority": "HIGH",
            "rationale": "Defines defensible legal traceability.",
            "expected_owner": "Legal Counsel",
        },
        {
            "text": "What data-retention period applies to automated claim decisions?",
            "priority": "HIGH",
            "rationale": "Establishes a legally approved retention rule.",
            "expected_owner": "Legal Counsel",
        },
        {
            "text": "Which jurisdictions impose additional requirements on this workflow?",
            "priority": "HIGH",
            "rationale": "Surfaces jurisdiction-specific constraints.",
            "expected_owner": "Legal Counsel",
        },
    ],
    "compliance": [
        {
            "text": "Which regulatory controls must execute before automatic approval?",
            "priority": "CRITICAL",
            "rationale": "Defines mandatory compliance gates.",
            "expected_owner": "Compliance Owner",
        },
        {
            "text": "What audit evidence must be stored for those controls?",
            "priority": "HIGH",
            "rationale": "Defines evidence needed to prove control execution.",
            "expected_owner": "Compliance Owner",
        },
        {
            "text": "What should happen if a required compliance check cannot be completed?",
            "priority": "CRITICAL",
            "rationale": "Defines safe failure behavior for mandatory controls.",
            "expected_owner": "Compliance Owner",
        },
    ],
    "it / engineering": [
        {
            "text": "Which systems are the systems of record for claim, policy, fraud, and payment data?",
            "priority": "CRITICAL",
            "rationale": "Identifies authoritative technical sources.",
            "expected_owner": "Engineering / Platform Owner",
        },
        {
            "text": "Which APIs or interfaces are available for the required decision data?",
            "priority": "HIGH",
            "rationale": "Determines integration feasibility.",
            "expected_owner": "Engineering / Platform Owner",
        },
        {
            "text": "What should happen when an upstream dependency is unavailable?",
            "priority": "HIGH",
            "rationale": "Defines resilient and safe degraded-mode behavior.",
            "expected_owner": "Engineering / Platform Owner",
        },
        {
            "text": "Which technical constraints could block the MVP?",
            "priority": "HIGH",
            "rationale": "Surfaces feasibility blockers early.",
            "expected_owner": "Engineering / Platform Owner",
        },
    ],
    "data / analytics": [
        {
            "text": "Which data fields are required for an eligibility decision?",
            "priority": "CRITICAL",
            "rationale": "Defines the decision data contract.",
            "expected_owner": "Data / Analytics Owner",
        },
        {
            "text": "Which required fields have known quality or completeness issues?",
            "priority": "HIGH",
            "rationale": "Identifies data risks that can invalidate automated decisions.",
            "expected_owner": "Data / Analytics Owner",
        },
        {
            "text": "Which metrics should monitor decision quality after launch?",
            "priority": "MEDIUM",
            "rationale": "Defines measurable operating controls.",
            "expected_owner": "Data / Analytics Owner",
        },
    ],
    "customer service": [
        {
            "text": "What must be communicated to customers after an automated decision?",
            "priority": "HIGH",
            "rationale": "Defines the customer communication obligation.",
            "expected_owner": "Customer Service Owner",
        },
        {
            "text": "What should customers be told when a claim is routed to manual review?",
            "priority": "HIGH",
            "rationale": "Defines customer handling for exception paths.",
            "expected_owner": "Customer Service Owner",
        },
        {
            "text": "What escalation path should exist when a customer disputes the outcome?",
            "priority": "HIGH",
            "rationale": "Captures the human escalation process.",
            "expected_owner": "Customer Service Owner",
        },
    ],
}

GENERIC_QUESTIONS = [
    {
        "text": "What decisions or business rules does your department own for this project?",
        "priority": "CRITICAL",
        "rationale": "Establishes domain ownership before requirements are normalized.",
        "expected_owner": "Department Owner",
    },
    {
        "text": "Which existing policies, procedures, systems, or records support those rules?",
        "priority": "HIGH",
        "rationale": "Links human answers to enterprise evidence.",
        "expected_owner": "Department Owner",
    },
    {
        "text": "Which exceptions or edge cases could prevent the proposed workflow from operating safely?",
        "priority": "HIGH",
        "rationale": "Surfaces exceptions before approval.",
        "expected_owner": "Department Owner",
    },
    {
        "text": "Who has authority to approve the final requirements owned by your department?",
        "priority": "HIGH",
        "rationale": "Identifies accountable human approval authority.",
        "expected_owner": "Department Owner",
    },
]
