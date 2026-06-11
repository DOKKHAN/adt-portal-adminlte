FROM nginx:alpine

RUN apk add --no-cache gettext

COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY public/ /usr/share/nginx/html/

EXPOSE 80