build:
	gulp

test:
	mocha -R Spec

install:
	npm install mocha -g;

.PHONY: build test