build:
	gulp

test:
	export NODE_ENV=test && mocha -R Spec

install:
	npm install mocha -g;

clean:
	rm -rf emberbase_data emberbase_test_data emberbase_conf.json

.PHONY: build test install clean