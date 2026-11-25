export const spec = {
  "openapi": "3.1.0",
  "info": {
    "title": "TaxPulse Global — sample API",
    "version": "0.1.0",
    "description": "Unverified prototype calculations; fictional inputs only. Not suitable for filing, payroll or financial decisions."
  },
  "paths": {
    "/v1/catalog": {
      "get": {
        "operationId": "getSampleCatalog",
        "responses": {
          "200": {
            "description": "Sample country and module catalog"
          }
        }
      }
    },
    "/v1/country/calculate": {
      "post": {
        "operationId": "calculateCountrySample",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "country",
                  "taxYear",
                  "module",
                  "parameters"
                ],
                "properties": {
                  "country": {
                    "enum": [
                      "IN",
                      "US",
                      "GB"
                    ]
                  },
                  "taxYear": {
                    "const": "2026"
                  },
                  "module": {
                    "enum": [
                      "pit",
                      "payroll",
                      "capgains",
                      "vat",
                      "corporate",
                      "property",
                      "dtaa"
                    ]
                  },
                  "parameters": {
                    "type": "object",
                    "description": "For US pit calculations, optional filingStatus is one of single (default), mfj, hoh, mfs. For IN pit, residentIndividual is a required boolean: only true permits illustrative Section 87A/202 rebate and marginal relief on ordinary salary income. Other PIT inputs are grossSalary and optional preTaxDeductions. All results are illustrative and taxRulesVerified=false."
                  }
                },
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Unverified sample result"
          },
          "400": {
            "description": "Invalid input"
          }
        }
      }
    },
    "/v1/advanced/calculate": {
      "post": {
        "operationId": "calculateAdvancedScenario",
        "description": "Fictional scenario arithmetic only; no live rates or legal tax determination.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "module",
                  "parameters"
                ],
                "properties": {
                  "module": {
                    "enum": [
                      "salary_hike",
                      "fire_wealth",
                      "fx_payout",
                      "team_planner",
                      "transfer_pricing",
                      "quarterly_tax",
                      "equity_bonus",
                      "contractor_eor",
                      "gratuity_exit",
                      "freelancer_billing",
                      "freelancer_ledger",
                      "residency_payslip",
                      "ctc_restructurer",
                      "bulk_csv",
                      "tax_vault",
                      "payroll_hra_generator",
                      "ca_handoff",
                      "pe_risk",
                      "expat_nomad",
                      "agent_deal_desk"
                    ]
                  },
                  "parameters": {
                    "type": "object"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Scenario calculation"
          },
          "400": {
            "description": "Invalid parameters"
          }
        }
      }
    },
    "/v1/capabilities": {
      "get": {
        "operationId": "getCapabilities",
        "responses": {
          "200": {
            "description": "Actual preview capabilities and disabled services"
          }
        }
      }
    },
    "/v1/regulatory/status": {
      "get": {
        "operationId": "getRegulatoryStatus",
        "responses": {
          "200": {
            "description": "Static regulatory verification manifest; not a live monitoring report"
          }
        }
      }
    },
    "/v1/discovery": {
      "get": {
        "operationId": "getDiscovery",
        "responses": {
          "200": {
            "description": "REST discovery metadata"
          }
        }
      }
    },
    "/v1/taxable-income/calculate": {
      "post": {
        "operationId": "calculateTaxableIncomeSample",
        "description": "Fictional scoped income tax examples for DE, CA, AU, SG and AE. AE accepts employee wages only; other examples require taxable income. Not take-home pay.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "oneOf": [
                  {
                    "type": "object",
                    "required": [
                      "country",
                      "taxYear",
                      "taxableIncome",
                      "assessment"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "country": {
                        "const": "DE"
                      },
                      "taxYear": {
                        "const": "2026"
                      },
                      "taxableIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000
                      },
                      "assessment": {
                        "enum": [
                          "individual",
                          "joint"
                        ]
                      }
                    }
                  },
                  {
                    "type": "object",
                    "required": [
                      "country",
                      "taxYear",
                      "taxableIncome",
                      "netIncome",
                      "fullYearResident"
                    ],
                    "additionalProperties": false,
                    "properties": {
                      "country": {
                        "const": "CA"
                      },
                      "taxYear": {
                        "const": "2026"
                      },
                      "taxableIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000
                      },
                      "netIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000
                      },
                      "fullYearResident": {
                        "const": true
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "country",
                      "taxYear",
                      "taxableIncome",
                      "residentEligible"
                    ],
                    "properties": {
                      "country": {
                        "const": "AU"
                      },
                      "taxYear": {
                        "const": "2026"
                      },
                      "taxableIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000
                      },
                      "residentEligible": {
                        "const": true
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "country",
                      "taxYear",
                      "taxableIncome",
                      "residentEligible"
                    ],
                    "properties": {
                      "country": {
                        "const": "SG"
                      },
                      "taxYear": {
                        "const": "2026"
                      },
                      "taxableIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000
                      },
                      "residentEligible": {
                        "const": true
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "country",
                      "taxYear",
                      "salaryIncome",
                      "employeeWagesOnly"
                    ],
                    "properties": {
                      "country": {
                        "const": "AE"
                      },
                      "taxYear": {
                        "const": "2026"
                      },
                      "salaryIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000
                      },
                      "employeeWagesOnly": {
                        "const": true
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Unverified scoped calculation"
          },
          "400": {
            "description": "Invalid or unsupported input"
          }
        }
      }
    },
    "/v1/india/regime-compare": {
      "post": {
        "operationId": "compareIndiaRegimes",
        "description": "Unverified ordinary salary examples only for FY 2026–27. Other deductions are caller-confirmed eligible amounts excluding the standard deduction.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "additionalProperties": false,
                "required": [
                  "country",
                  "taxYear",
                  "grossSalary",
                  "residentIndividual",
                  "ageGroup",
                  "ordinarySalaryOnly",
                  "oldEligibleDeductions",
                  "newEligibleDeductions"
                ],
                "properties": {
                  "country": {
                    "const": "IN"
                  },
                  "taxYear": {
                    "const": "2026"
                  },
                  "grossSalary": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 1000000000
                  },
                  "residentIndividual": {
                    "type": "boolean"
                  },
                  "ageGroup": {
                    "enum": [
                      "under-60",
                      "60-79",
                      "80-plus"
                    ]
                  },
                  "ordinarySalaryOnly": {
                    "const": true
                  },
                  "oldEligibleDeductions": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 1000000000
                  },
                  "newEligibleDeductions": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 1000000000
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Unsigned unverified comparison"
          },
          "400": {
            "description": "Unsupported input"
          }
        }
      }
    },
    "/v1/investment/capital-gain": {
      "post": {
        "operationId": "calculateCapitalGainExample",
        "description": "Scoped shares, property and cryptocurrency sale examples; assets and eligibility vary by country. India crypto requires gross proceeds, acquisition cost only and zero eligibleLosses. See returned limitations.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "oneOf": [
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "taxYear",
                      "acquired",
                      "disposed",
                      "saleProceeds",
                      "adjustedBasis",
                      "eligibleLosses",
                      "otherTaxableIncome",
                      "scopeConfirmed",
                      "country",
                      "assetType"
                    ],
                    "properties": {
                      "taxYear": {
                        "const": "2026"
                      },
                      "acquired": {
                        "type": "string",
                        "format": "date"
                      },
                      "disposed": {
                        "type": "string",
                        "format": "date"
                      },
                      "saleProceeds": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "adjustedBasis": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "eligibleLosses": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "otherTaxableIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "scopeConfirmed": {
                        "const": true
                      },
                      "country": {
                        "const": "IN"
                      },
                      "assetType": {
                        "enum": [
                          "listed-equity",
                          "equity-fund",
                          "property",
                          "crypto"
                        ]
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "taxYear",
                      "acquired",
                      "disposed",
                      "saleProceeds",
                      "adjustedBasis",
                      "eligibleLosses",
                      "otherTaxableIncome",
                      "scopeConfirmed",
                      "country",
                      "filingStatus"
                    ],
                    "properties": {
                      "taxYear": {
                        "const": "2026"
                      },
                      "acquired": {
                        "type": "string",
                        "format": "date"
                      },
                      "disposed": {
                        "type": "string",
                        "format": "date"
                      },
                      "saleProceeds": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "adjustedBasis": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "eligibleLosses": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "otherTaxableIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "scopeConfirmed": {
                        "const": true
                      },
                      "country": {
                        "const": "US"
                      },
                      "filingStatus": {
                        "enum": [
                          "single",
                          "mfj",
                          "mfs",
                          "hoh"
                        ]
                      },
                      "assetType": {
                        "enum": [
                          "listed-equity",
                          "investment-land",
                          "crypto"
                        ]
                      }
                    }
                  },
                  {
                    "type": "object",
                    "additionalProperties": false,
                    "required": [
                      "taxYear",
                      "acquired",
                      "disposed",
                      "saleProceeds",
                      "adjustedBasis",
                      "eligibleLosses",
                      "otherTaxableIncome",
                      "scopeConfirmed",
                      "country"
                    ],
                    "properties": {
                      "taxYear": {
                        "const": "2026"
                      },
                      "acquired": {
                        "type": "string",
                        "format": "date"
                      },
                      "disposed": {
                        "type": "string",
                        "format": "date"
                      },
                      "saleProceeds": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "adjustedBasis": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "eligibleLosses": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "otherTaxableIncome": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1000000000,
                        "multipleOf": 0.01
                      },
                      "scopeConfirmed": {
                        "const": true
                      },
                      "country": {
                        "const": "GB"
                      },
                      "assetType": {
                        "enum": [
                          "listed-equity",
                          "property",
                          "crypto"
                        ]
                      }
                    }
                  }
                ]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Scoped example gain tax"
          },
          "400": {
            "description": "Unsupported input"
          }
        }
      }
    }
  }
};
