FROM node:22-bookworm

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        git \
        curl \
        sudo \
        jq \
        chromium \
    && rm -rf /var/lib/apt/lists/*

ENV ROD_CHROME_BIN=/usr/bin/chromium

RUN useradd -m -s /bin/bash -u 60000 dev && \
    echo 'dev ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/dev && \
    chmod 0440 /etc/sudoers.d/dev && \
    passwd -d root
USER dev

WORKDIR /home/dev

ENV PATH="/home/dev/.local/bin:$PATH"

RUN curl -LsSf https://astral.sh/uv/install.sh | sh
RUN uv tool install rodney
RUN uv tool install showboat
RUN uv cache clean

RUN curl -fsSL https://claude.ai/install.sh | bash

COPY .disposables/claude.json /home/dev/.claude.json

WORKDIR /tmp/preinstalls
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
RUN npx playwright install
