tmp/md5public.json: $(shell find -L public -type f)
	mkdir -p $(@D)
	./bin/md5public > $@