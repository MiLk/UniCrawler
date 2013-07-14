exports.models = {
  "State": {
    "id": "State",
    "properties": {
      "working": {
        "type": "int"
      },
      "visited": {
        "type": "int"
      }
    }
  },
  "Depth": {
    "id": "Depth",
    "properties": {
      "depth": {
        "type": "int"
      }
    }
  },
  "Filters": {
    "id": "Filters",
    "properties": {
      "url": {
        "type": "Array",
        "description": "Keyword list",
        "items": {
          "$ref": "string"
        }
      },
      "title": {
        "type": "Array",
        "description": "Keyword list",
        "items": {
          "$ref": "string"
        }
      },
      "body": {
        "type": "Array",
        "description": "Keyword list",
        "items": {
          "$ref": "string"
        }
      }
    }
  }
}