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
                    "type": "object"
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
                      "quarterly_tax"
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
    }
  }
};
