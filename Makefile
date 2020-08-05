PACKAGE_NAME = typical-reply

.PHONY: all xpi signed clean

all: xpi

xpi: update_extlib install_extlib
	rm -f ./$(PACKAGE_NAME).xpi
	zip -r -9 $(PACKAGE_NAME).xpi manifest.json chrome.manifest content defaults locale modules -x '*/.*' >/dev/null 2>/dev/null

update_extlib:
	git submodule update --init

install_extlib:
	rm -f extlib/*.js
	cp submodules/webextensions-lib-dom-updater/src/diff.js modules/extlib/
	cp submodules/webextensions-lib-dom-updater/src/dom-updater.js modules/extlib/

makexpi/makexpi.sh:
	git submodule update --init

signed: xpi
	makexpi/sign_xpi.sh -k $(JWT_KEY) -s $(JWT_SECRET) -p ./$(PACKAGE_NAME)_noupdate.xpi

clean:
	rm $(PACKAGE_NAME).xpi $(PACKAGE_NAME)_noupdate.xpi sha1hash.txt
