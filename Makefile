build:
	gulp

test:
	export NODE_ENV=test && mocha -R Spec

install:
	npm install mocha -g;

.PHONY: build test install