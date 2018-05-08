ifndef ENV
    ENV = development
endif

.PHONY: build
build: node_modules public/index.css public/head.js public/vendor.js public/index.js md5public
	echo "Ok, built for env $$ENV"

HEADMODULES = ./vendor/modernizr.js:modernizr
public/head.js: ./vendor/modernizr.js browser/head.js
	mkdir -p $(@D)
	./node_modules/.bin/browserify --debug \
	  $$(for i in $(HEADMODULES); do echo "-r $$i"; done) \
	  -r ./browser/head.js:head \
	  >$@
	echo ";require('head');" >> $@
ifneq ($(ENV), development)
	./node_modules/.bin/uglifyjs $@ -o $@ -m
endif

VENDORMODULES = jquery hammerjs lodash backbone dustjs-linkedin dustjs-helpers querystring url consistent-hashing moment moment/locale/fr ./vendor/jquery.hammer.js:jquery-hammer ./vendor/form2js.js:form2js ./vendor/jquery.scrollto.js:jquery-scrollto
public/vendor.js: ./node_modules/.bin/browserify $(shell find vendor -type f) $(shell find node_modules -type f)
	mkdir -p $(@D)
	./node_modules/.bin/browserify --debug \
	  $$(for i in $(VENDORMODULES); do echo "-r $$i"; done) \
	  >$@
ifneq ($(ENV), development)
	./node_modules/.bin/uglifyjs $@ -o $@ -m
endif
public/index.js: ./node_modules/.bin/browserify $(shell find browser -type f) $(shell find brover -type f)
	mkdir -p $(@D)
	./node_modules/.bin/browserify --debug \
	  $$(for i in $(HEADMODULES); do echo $$i | awk -F':' '{printf " -x %s", ($$2 == "" ? $$1 : $$2)}'; done) \
	  $$(for i in $(VENDORMODULES); do echo $$i | awk -F':' '{printf " -x %s", ($$2 == "" ? $$1 : $$2)}'; done) \
	  -r ./browser/index.js:Wwwapp \
	  >$@
ifneq ($(ENV), development)
	./node_modules/.bin/uglifyjs $@ -o $@ -m
endif

public/index.css: styles/tmp/md5public.json $(shell find styles -type f -name '*.styl') $(shell find styles/vendor -type f -name '*.css') styles/bin/stylus.js styles/lib/stylus-url.js
	node styles/bin/stylus.js > $@
	./node_modules/.bin/postcss --use autoprefixer --autoprefixer.browsers "> 5%, Explorer >= 11" -o $@ $@
ifneq ($(ENV), development)
	./node_modules/.bin/cleancss -d $@ -o $@
endif
styles/tmp/md5public.json: $(shell find -L public -not -name "index.css*" -type f)
	mkdir -p $(@D)
	./bin/md5public > $@

.PHONY: md5public
md5public:
	$(MAKE) -f md5public.mk

node_modules:
	npm install
./node_modules/%:
	npm install

.PHONY: test
test: test-unit test-functional

.PHONY: test-unit
test-unit: ./node_modules/.bin/tap
	wwwapp_recaptcha_id="" ./node_modules/.bin/tap --node-arg=--inspect=0.0.0.0:9229 --bail -R spec test/unit/*.js

.PHONY: test-functional
test-functional: ./node_modules/.bin/tap
	./node_modules/.bin/tap test/functional/index.js

.PHONY: mostlyclean
mostlyclean:
	rm -Rf public/index.css public/head.js public/vendor.js public/index.js tmp/md5public.json

.PHONY: clean
clean:
	$(MAKE) mostlyclean
	rm -Rf node_modules/

.PHONY: debug
debug:
	echo $(ENV)


.FORCE:
