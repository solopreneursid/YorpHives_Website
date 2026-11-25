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
        "description": "Fictional examples: German ordinary tariff, Canadian federal tax after BPA only. Not gross salary or take-home pay.",
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
    }
  }
};
