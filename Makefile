SHELL := /bin/bash

# Variables
HUGO ?= hugo
NODE ?= node
PROJECT ?= slowfolio
# Comma-separated keys e.g. ALBUM_KEYS=trip-2024,another
ALBUM_KEYS ?=

.PHONY: help gen gen-all serve build deploy clean

help:
	@echo "Targets:"
	@echo "  gen        Generate chapters for ALBUM_KEYS (env)"
	@echo "  gen-all    Generate chapters for all stories in data/stories"
	@echo "  serve      Generate all, then run hugo server -D"
	@echo "  build      Generate all, then build Hugo to public/"
	@echo "  deploy     Build then deploy via wrangler pages (requires wrangler)"
	@echo "  clean      Remove generated chapter markdown and album orders"

gen:
	@if [ -z "$(ALBUM_KEYS)" ]; then \
		echo "Set ALBUM_KEYS=trip-2024[,another]"; exit 1; \
	fi
	$(NODE) scripts/generate.mjs --keys $(ALBUM_KEYS)

gen-all:
	$(NODE) scripts/generate.mjs --all

serve: gen-all
	$(HUGO) server -D

build: gen-all
	$(HUGO) --minify

deploy: build
	@command -v npx >/dev/null 2>&1 || { echo >&2 "npx is required (Node)"; exit 1; }
	@npx wrangler pages deploy public --project-name "$(PROJECT)"

clean:
	rm -f data/albums/*.yaml || true
	rm -f content/albums/*/*.md || true
