const GITHUB_OWNER = "FormationFlight";
const GITHUB_REPO = "FormationFlight";
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

function formatLabel(fileName) {
    let parts = fileName.replace('diy_', '');

    try {
        parts = parts.replace('433', '433MHz');
        parts = parts.replace('868', '868MHz');
        parts = parts.replace('915', '915MHz');
        parts = parts.replace('2400', '2.4GHz');
    } catch (err) {
        parts = parts;
    }

    const rawParts = parts.replace('.bin', '').split('_');
    const deviceBase = rawParts.length > 1 ? rawParts[0] : 'unknown';

    if (rawParts[1] && rawParts[1].includes('lilygo') && !rawParts[1].includes('t_beam')) {
        if (rawParts[1].length > 6) {
            rawParts[1] = `Lilygo v${rawParts[1][6]}.${rawParts[1].slice(7)}`;
        } else {
            rawParts[1] = 'Lilygo';
        }
    } else if (rawParts[1] && rawParts[1].includes('Heltec')) {
        if (rawParts[4] && rawParts[4].length >= 2) {
            rawParts[4] = `v${rawParts[4][0]}.${rawParts[4][1]}`;
        }
    }

    const additionalInfo = rawParts.slice(1).join(' ');
    const label = `${deviceBase.charAt(0).toUpperCase()}${deviceBase.slice(1)} ${additionalInfo}`.trim();
    return label || fileName;
}

function detectChipFamily(label) {
    if (label.includes('8266')) {
        return 'ESP8266';
    }
    if (label.includes('Diversity')) {
        return 'ESP32';
    }
    if (label.includes('32') || label.toLowerCase().includes('lilygo')) {
        return 'ESP32';
    }
    if (label.toLowerCase().includes('expresslrs')) {
        return 'ESP8285';
    }
    return 'ESP32';
}

function detectGroup(fileName, label) {
    const lowerName = fileName.toLowerCase();
    const lowerLabel = label.toLowerCase();

    if (lowerName.includes('expresslrs') || lowerName.includes('elrs') || lowerLabel.includes('expresslrs')) {
        return 'ExpressLRS';
    }

    if (lowerName.includes('lora') || lowerLabel.includes('lora')) {
        return 'LoRa';
    }

    if (lowerName.includes('esnow') || lowerLabel.includes('esnow') || lowerName.includes('espnow') || lowerLabel.includes('espnow')) {
        return 'ESP-NOW';
    }

    if (/(433|868|915|2400)mhz/.test(lowerLabel) || /(433|868|915|2400)/.test(lowerName)) {
        return 'LoRa';
    }

    return 'Other';
}

function markdownToHtml(markdown) {
    markdown = markdown.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,
        '<a href="$1" target="_blank" class="text-blue-500 hover:text-blue-700 transition duration-300 ease-in-out">$1</a>'
    );

    let html = markdown.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g,
        '<a href="$2" target="_blank" class="text-blue-500 hover:text-blue-700 transition duration-300 ease-in-out">$1</a>'
    );

    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
    html = html.replace(/^###\s?(.+)/gm, '<h3 class="text-xl font-semibold mt-3 mb-2">$1</h3>');
    html = html.replace(/^##\s?(.+)/gm, '<h2 class="text-2xl font-semibold mt-4 mb-2">$1</h2>');
    html = html.replace(/^#\s?(.+)/gm, '<h1 class="text-3xl font-semibold mt-5 mb-3">$1</h1>');

    html = html.replace(/(\n\*\s.+(?:\n\*.+)*)/g, function(match) {
        const items = match.trim().split('\n');
        const listItems = items.map(item => `<li class="ml-4 list-disc">${item.substring(2)}</li>`).join('');
        return `<ul class="list-outside pl-5 mt-2 mb-2">${listItems}</ul>`;
    });

    return html;
}

function buildManifest({ label, version, assetUrl }) {
    return {
        name: `FormationFlight for ${label}`,
        version,
        builds: [
            {
                chipFamily: detectChipFamily(label),
                parts: [
                    {
                        path: assetUrl,
                        offset: 0
                    }
                ]
            }
        ]
    };
}

async function fetchLatestRelease() {
    const response = await fetch(GITHUB_API_URL, {
        headers: {
            "Accept": "application/vnd.github+json"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch latest release (${response.status})`);
    }

    return response.json();
}

function buildGroupedOptions(selectElement, deviceTypes) {
    const groupOrder = ['ExpressLRS', 'LoRa', 'ESP-NOW', 'Other'];
    const grouped = new Map();

    groupOrder.forEach(group => grouped.set(group, []));

    deviceTypes.forEach(device => {
        const group = device.group || 'Other';
        if (!grouped.has(group)) {
            grouped.set(group, []);
        }
        grouped.get(group).push(device);
    });

    groupOrder.forEach(group => {
        const devices = grouped.get(group) || [];
        if (!devices.length) {
            return;
        }
        const optgroup = document.createElement('optgroup');
        optgroup.label = group;
        devices.sort((a, b) => a.label.localeCompare(b.label)).forEach(({ value, label }) => {
            const option = new Option(label, value);
            optgroup.appendChild(option);
        });
        selectElement.add(optgroup);
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const versionElement = document.getElementById('release-version');
    const notesContentElement = document.getElementById('notes-content');
    const releaseNotesDiv = document.getElementById('release-notes');
    const toggleNotesButton = document.getElementById('toggleNotes');
    const selectElement = document.getElementById('deviceTypeSelect');
    const installButton = document.querySelector('esp-web-install-button');

    let currentManifestUrl = null;

    toggleNotesButton.addEventListener('click', function() {
        if (releaseNotesDiv) {
            releaseNotesDiv.style.display = (releaseNotesDiv.style.display === 'none') ? 'block' : 'none';
            this.textContent = (releaseNotesDiv.style.display === 'none') ? 'Show Release Notes' : 'Hide Release Notes';
        }
    });

    try {
        const releaseData = await fetchLatestRelease();
        const version = releaseData.tag_name || 'Unknown version';
        const notes = releaseData.body || 'No release notes available.';

        if (versionElement) {
            versionElement.innerText = `Release Version: ${version}`;
        }

        if (notesContentElement) {
            notesContentElement.innerHTML = markdownToHtml(notes);
        }

        if (releaseNotesDiv) {
            releaseNotesDiv.style.display = 'none';
        }

        const assets = (releaseData.assets || []).filter(asset => asset.name.endsWith('.bin'));
        const deviceTypes = [{ value: 'none', label: '-> Select Target', group: 'Other' }];
        const deviceMap = new Map();

        assets.forEach(asset => {
            const deviceName = asset.name.replace(/\.bin$/, '');
            const label = formatLabel(asset.name);
            const group = detectGroup(asset.name, label);

            deviceTypes.push({ value: deviceName, label, group });
            deviceMap.set(deviceName, {
                label,
                assetUrl: asset.browser_download_url
            });
        });

        selectElement.innerHTML = '';
        const placeholderOption = new Option('-> Select Target', 'none');
        selectElement.add(placeholderOption);
        buildGroupedOptions(selectElement, deviceTypes.filter(device => device.value !== 'none'));

        selectElement.addEventListener('change', () => {
            const selectedValue = selectElement.value;
            if (currentManifestUrl) {
                URL.revokeObjectURL(currentManifestUrl);
                currentManifestUrl = null;
            }

            if (!selectedValue || selectedValue === 'none') {
                installButton.classList.add('invisible');
                return;
            }

            const deviceInfo = deviceMap.get(selectedValue);
            if (!deviceInfo) {
                installButton.classList.add('invisible');
                return;
            }

            const manifest = buildManifest({
                label: deviceInfo.label,
                version,
                assetUrl: deviceInfo.assetUrl
            });

            const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
            currentManifestUrl = URL.createObjectURL(manifestBlob);
            installButton.manifest = currentManifestUrl;
            installButton.classList.remove('invisible');
        });
    } catch (error) {
        if (versionElement) {
            versionElement.innerText = 'Unable to load release data.';
        }
        if (notesContentElement) {
            notesContentElement.innerHTML = '<p class="text-red-400">Failed to load release notes. Please try again later.</p>';
        }
        console.error(error);
    }
});
