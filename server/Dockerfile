ARG DEV_IMAGE
ARG FRONTEND_IMAGE
FROM ${FRONTEND_IMAGE}:latest as frontend
RUN cd /app/dist && \
    # Pre-compress static files, creating a new .gz file for each.
    find . -type f -regextype posix-extended \
        -iregex '.*\.(html|css|js|txt|xml|svg|eot|woff|ttf|pdf)$' \
        -exec zopfli '{}' ';' && \
    # This losslessly compresses all png images in-place.
    # The pngs are never interlaced, which saves space.
    # All color information from fully transparent pixels is removed to save
    # space (no visual difference).
    find . -type f -regextype posix-extended \
        -iregex '.*\.png$' \
        -exec zopflipng -y --lossy_transparent '{}' '{}' ';'

FROM ${DEV_IMAGE}:latest
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=frontend /app/dist /usr/share/nginx/html
