#!/bin/sh

show_help() {
    cat << EOF
Usage: ${0##*/} OPTIONS

--herokuapp=%appname%  deploy to corresponding Heroku %appname%
EOF

    exit 1
}

# By default --env=$TRAVIS_BRANCH, eg: --env=master or --env=stage
env=$TRAVIS_BRANCH
herokuapp=

# see: http://mywiki.wooledge.org/BashFAQ/035
while :; do
    case $1 in
        -h|-\?|--help)
            show_help    # Display a usage synopsis.
            exit
            ;;
        --herokuapp)       # Takes an option argument; ensure it has been specified.
            if [ "$2" ]; then
                herokuapp=$2
                shift
            else
                die 'ERROR: "--herokuapp" requires a non-empty option argument.'
            fi
            ;;
        --herokuapp=?*)
            herokuapp=${1#*=} # Delete everything up to "=" and assign the remainder.
            ;;
        --herokuapp=)         # Handle the case of an empty --herokuapp=
            die 'ERROR: "--herokuapp" requires a non-empty option argument.'
            ;;
        --)              # End of all options.
            shift
            break
            ;;
        -?*)
            printf 'WARN: Unknown option (ignored): %s\n' "$1" >&2
            ;;
        *)               # Default case: No more options, so break out of the loop.
            break
    esac

    shift
done

#
# Push to Heroku's registry
#

if [ ! -z "$herokuapp" ]; then
	heroku --version || exit 1

	make clean && heroku container:push web --app $herokuapp || exit 1
	heroku container:release web --app $herokuapp || exit 1
else
	echo '$herokuapp is not defined, we cannot deploy to it.'
	exit 1
fi

exit 0
