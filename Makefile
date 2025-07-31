YEAR ?= $(shell date +%Y)
MONTH ?= $(shell date +%m)
CLIENT ?= ACME
SEQ ?= 1
CUSTOM_HOURS ?= ""
ITEMS ?= ""

.PHONY: invoice help

help:
	@echo "Usage:"
	@echo "  make install          Install dependencies."
	@echo "  make invoice          Generate an invoice for the current month and year."
	@echo "  make invoice CLIENT=XYZ YEAR=2025 MONTH=7 SEQ=2  Generate a second invoice for a specific client, month and year."
	@echo "  make invoice YEAR=2025 MONTH=7 CUSTOM_HOURS=\"2025-07-10:4,2025-07-15:6\"  Generate an invoice with custom hours."
	@echo "  make invoice CLIENT=ACME YEAR=2025 MONTH=7 ITEMS=\"Feature A:10,Feature B:20\"  Generate an invoice with specific line items."


invoice:
	node src/generate-pdf.js $(YEAR) $(MONTH) $(CLIENT) $(SEQ) "$(CUSTOM_HOURS)" "$(ITEMS)"

install:
	npm install
