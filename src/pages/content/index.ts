console.info("content loaded");

const ID_PREFIX = "twitrep-";
const POPUP = ID_PREFIX + "popup";
const ONBOARDING = ID_PREFIX + "onboarding";

/**
 * Return the string with the first letter capitalized.
 */
function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Add reputation cards to the user profile currently being viewed,
 * if such cards exist and the current route is a Twitter profile.
 */
async function addReputationCardsToProfile() {
  //
  // Fetch the results from storage or API.
  //

  await chrome.runtime.sendMessage({ type: "RESULTS" });
  const data = await chrome.storage.local.get("results");
  const results = data.results;

  //
  // Get the header image and username from the DOM.
  //
  const elements = document.querySelectorAll('[href*="/header_photo"]');

  if (elements.length == 0) {
    return;
  }

  const headerImg = elements[0];

  // The header image href is '/:username/header_photo'
  const username = headerImg
    .getAttribute("href")
    ?.replace("/header_photo", "")
    ?.replace("/", "");

  //
  // Get the PageRank results for the user.
  //
  const cards = [];

  for (const [listName, list] of Object.entries(results.lists)) {
    for (const [keyword, users] of Object.entries(list)) {
      for (const user of users) {
        if (user.username == username) {
          cards.push({
            list: listName,
            keyword: capitalizeFirstLetter(keyword),
            user: user,
            otherUsers: users.filter((u: string) => u != user),
          });
        }
      }
    }
  }

  if (cards.length == 0) {
    const view = document.getElementById(ID_PREFIX + "cards");

    // Remove the view if it already exist.
    if (view) {
      view.parentNode.removeChild(view);
    }

    return;
  }

  //
  // Insert the cards into the DOM.
  //

  // Verify that the view doesn't already exist.
  const view = document.getElementById(ID_PREFIX + "cards");

  if (view) {
    return;
  }

  // Create the view and append it to the header.
  headerImg.parentNode.appendChild(createCardsView(cards));
}

/**
 * Add reputation badges to tweets in the timeline.
 */
async function addReputationBadgesToTimeline() {
  //
  // Fetch the results from storage or API.
  //
  await chrome.runtime.sendMessage({ type: "RESULTS" });
  const data = await chrome.storage.local.get("results");
  const results = data.results;

  //
  // Get all relevant badges to display from the results.
  //
  const badges = [];

  for (const [listName, list] of Object.entries(results.lists)) {
    for (const [keyword, users] of Object.entries(list)) {
      for (const user of users) {
        badges.push({
          user: user,
          list: listName,
          keyword: capitalizeFirstLetter(keyword),
          otherUsers: users.filter((u) => u != user),
        });
      }
    }
  }

  if (badges.length == 0) {
    return;
  }

  //
  // Get all the tweets that should display a badge.
  //

  const tweetHeaders = [
    ...document.querySelectorAll('[data-testid="User-Names"]'),
  ];

  for (const tweetHeader of tweetHeaders) {
    // Get the <a> tag from the tweet header.
    const a = tweetHeader?.children[1].children[0].children[0].children[0];

    // The href property of the a tag for the user link is /:username.
    const username = a?.getAttribute("href")?.replace("/", "");

    // The badges that should be displayed for the user.
    const badgesToDisplay = badges.filter((b) => b.user.username == username);

    if (badgesToDisplay.length == 0) {
      continue;
    }

    // Append the badges view to the tweet header.
    const container =
      tweetHeader.parentNode?.parentNode?.parentNode?.parentNode;

    const containerHasBadges =
      [...container.children].filter((c) => c.className == ID_PREFIX + "badges")
        .length > 0;

    if (!containerHasBadges) {
      container.appendChild(createBadgesView(badgesToDisplay));
    }
  }
}

/**
 * Create a view for badges to display on a user's tweet.
 */
function createBadgesView(
  badges: {
    keyword: string;
    user: { name: string };
    list: string;
    otherUsers: [{ profile_image_url: string }];
  }[]
) {
  const view = document.createElement("div");
  view.className = ID_PREFIX + "badges";

  // Append a badge view for each badge.
  for (const badge of badges) {
    const badgeContainer = document.createElement("div");
    badgeContainer.className = ID_PREFIX + "badge";

    // Add the profiles.
    badgeContainer.appendChild(createProfilesView(badge.otherUsers));
    badgeContainer.addEventListener("click", showPopup, false);

    // Add the badge text.
    const name = document.createElement("p");
    name.innerText = `${badge.list} • ${badge.keyword}`;
    badgeContainer.appendChild(name);

    // Append the badge to the container.
    view.appendChild(badgeContainer);
  }

  return view;
}

function createProfilesView(users: [{ profile_image_url: string }]) {
  const profiles = document.createElement("div");
  profiles.className = ID_PREFIX + "profile-container";

  for (let i = 0; i < 3; i++) {
    const img = document.createElement("img");

    img.src = users[i].profile_image_url;
    img.className = ID_PREFIX + "profile-img";

    profiles.appendChild(img);
  }

  return profiles;
}

/**
 * Create a view for cards to display on a user's profile.
 */
function createCardsView(
  cards: {
    keyword: string;
    user: { name: string };
    list: string;
    otherUsers: [{ profile_image_url: string }];
  }[]
) {
  // Create a container for the cards.
  const view = document.createElement("div");
  view.id = ID_PREFIX + "cards";

  // Append a card view for each card object to the container.
  for (const card of cards) {
    // The container of the card content.
    const cardContainer = document.createElement("div");
    cardContainer.className = ID_PREFIX + "card";
    cardContainer.addEventListener("click", showPopup, false);
    view.appendChild(cardContainer);

    // The title of the card.
    const h4 = document.createElement("h4");
    h4.innerText = card.keyword;

    // The row of the profile images and description of the card.
    const row = document.createElement("div");
    row.className = ID_PREFIX + "row";
    cardContainer.appendChild(h4);
    cardContainer.appendChild(row);

    row.appendChild(createProfilesView(card.otherUsers));

    // The text of the card.
    const text = document.createElement("p");
    text.innerHTML = `<strong>${card.user.name}</strong> seems knowledgable about <strong>${card.keyword}</strong> to people in <strong>${card.list}</strong>.`;
    row.appendChild(text);
  }

  // Return the view.
  return view;
}

function showPopup(e: Event) {
  e.stopPropagation();

  const popup = document.getElementById(ID_PREFIX + "popup-container");

  popup?.style.setProperty("opacity", "1");
  popup?.style.setProperty("visibility", "visible");
}

function hidePopup(e: Event) {
  e.stopPropagation();

  const popup = document.getElementById(ID_PREFIX + "popup-container");

  popup?.style.setProperty("opacity", "0");
  popup?.style.setProperty("visibility", "hidden");
}

function hideOnboarding(e: Event) {
  e.stopPropagation();

  const popup = document.getElementById(ID_PREFIX + "onboarding-container");

  popup?.style.setProperty("opacity", "0");
  popup?.style.setProperty("visibility", "hidden");
}

function showOnboarding(step: number) {
  console.log("inside show onboarding");

  const modal = document.getElementById(ID_PREFIX + "onboarding-container");
  let html: string;

  if (step == 0) {
    // The HTML for the modal.
    html = `
  <div id="${ID_PREFIX}onboarding-container">
    <div id="${ID_PREFIX}onboarding">
      <h2>Welcome!</h2>
      <button id="${ID_PREFIX}onboarding-close">&times;</button>
      <div id="${ID_PREFIX}onboarding-content">
        <p>TwitRep is an experimental multi-dimensional reputation system built for Twitter. It uses conversations between people in lists to determine who seem trustworthy. This is done using the PageRank algorithm and natural language processing.</p>
        <p>You will be asked to select which lists and areas you want to use TwitRep for.</p>
      </div>
      <div id="${ID_PREFIX}onboarding-next-row">
        <button id="${ID_PREFIX}onboarding-next">Next</button>
      </div>
    </div>
  </div>`.trim();
  } else if (step == 1) {
    html = `
    <div id="${ID_PREFIX}onboarding-container">
      <div id="${ID_PREFIX}onboarding">
        <h2>Which lists would you like to analyze?</h2>
        <button id="${ID_PREFIX}onboarding-close">&times;</button>
        <div id="${ID_PREFIX}onboarding-content">
          <label class="${ID_PREFIX}onboarding-checkbox-container">One
            <input type="checkbox" checked="checked">
            <span class="${ID_PREFIX}onboarding-checkmark"></span>
          </label>

          <label class="${ID_PREFIX}onboarding-checkbox-container">Two
            <input type="checkbox">
            <span class="${ID_PREFIX}onboarding-checkmark"></span>
          </label>

          <label class="${ID_PREFIX}onboarding-checkbox-container">Three
            <input type="checkbox">
            <span class="${ID_PREFIX}onboarding-checkmark"></span>
          </label>

          <label class="${ID_PREFIX}onboarding-checkbox-container">Four
            <input type="checkbox">
            <span class="${ID_PREFIX}onboarding-checkmark"></span>
          </label>
        </div>
        <div id="${ID_PREFIX}onboarding-next-row">
          <button id="${ID_PREFIX}onboarding-back">Back</button> 
          <button id="${ID_PREFIX}onboarding-next">Next</button>
        </div>
      </div>
    </div>`.trim();
  } else if (step == 2) {
    html = `
    <div id="${ID_PREFIX}onboarding-container">
      <div id="${ID_PREFIX}onboarding">
        <h2>What type of reputation are you interested in?</h2>
        <button id="${ID_PREFIX}onboarding-close">&times;</button>
        <div id="#${ID_PREFIX}onboarding-content">
          <p>You can pick up to five types to track with TwitRep. \nThis could be any area where you struggle to know who you can trust on Twitter.</p>
        </div>
        <div id="${ID_PREFIX}onboarding-next-row">
          <button id="${ID_PREFIX}onboarding-back">Back</button>
          <button id="${ID_PREFIX}onboarding-next">Done</button>
        </div>
      </div>
    </div>`.trim();
  } else if (step == 3) {
    html = `
    <div id="${ID_PREFIX}onboarding-container">
      <div id="${ID_PREFIX}onboarding">
        <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M106.236 0.511132C104.861 0.759632 102.274 1.19013 100.486 1.46813C88.405 3.34613 77.1715 7.04763 65.7365 12.9181C53.937 18.9761 44.6345 25.7596 35.2295 35.1651C18.3915 52.0026 7.63 71.7196 2.477 95.1721C2.2355 96.2721 1.7915 98.7471 1.4905 100.672C1.19 102.597 0.7285 105.423 0.465 106.952C-0.155 110.555 -0.155 129.289 0.465 132.892C0.7285 134.421 1.19 137.247 1.4905 139.172C2.419 145.112 3.7585 150.782 5.686 156.927C7.9385 164.11 13.3765 175.732 17.965 183.172C26.9285 197.705 42.2035 212.98 56.7365 221.944C67.135 228.357 80.21 233.923 90.6115 236.365C95.5635 237.527 97.3385 237.887 100.736 238.418C102.661 238.719 105.487 239.18 107.016 239.444C110.619 240.064 129.353 240.064 132.956 239.444C134.485 239.18 137.311 238.719 139.236 238.418C145.176 237.49 150.846 236.15 156.991 234.223C164.174 231.97 175.796 226.532 183.236 221.944C197.769 212.98 213.045 197.705 222.008 183.172C228.392 172.821 234.034 159.585 236.394 149.422C237.669 143.931 237.967 142.466 238.482 139.172C238.783 137.247 239.245 134.421 239.508 132.892C240.128 129.289 240.128 110.555 239.508 106.952C239.245 105.423 238.783 102.597 238.482 100.672C237.109 91.8851 235.045 84.3551 231.697 75.9176C225.707 60.8211 216.539 46.9601 204.743 35.1651C198.319 28.7401 190.053 22.1051 183.236 17.9006C172.885 11.5166 159.649 5.87413 149.486 3.51463C143.995 2.23963 142.53 1.94113 139.236 1.42613C137.311 1.12563 134.485 0.664132 132.956 0.400632C129.53 -0.189368 109.66 -0.106868 106.236 0.511132ZM173.219 87.4051L182.192 96.3886L178.218 100.53C174.853 104.038 160.191 119.005 115.016 165.047C111.036 169.103 107.657 172.419 107.508 172.415C107.247 172.409 103.612 168.947 89.9865 155.729C71.7765 138.065 62.9865 129.371 62.9865 129.023C62.9865 128.81 67.039 124.606 71.992 119.68L80.998 110.725L83.117 112.736C84.283 113.843 87.4835 116.868 90.2295 119.46C92.9755 122.052 97.348 126.197 99.9455 128.672C102.543 131.147 105.2 133.678 105.85 134.297C106.5 134.916 107.199 135.422 107.404 135.422C107.803 135.422 112.128 131.059 143.003 99.5026C153.856 88.4091 162.811 79.1281 162.903 78.8776C163.316 77.7491 164.799 78.9751 173.219 87.4051Z" fill="#479BE9"/>
        </svg>
        <h2>All Good!</h2>
        <div id="#${ID_PREFIX}onboarding-content">
          <p>Reputation is being calculated in the background.</p>
        </div>
        <button id="${ID_PREFIX}onboarding-done">Done</button>
      </div>
    </div>`.trim();
  } else {
    throw Error("Invalid onboarding step");
  }

  // Create the HTML template.
  const template = document.createElement("template");
  template.innerHTML = html;

  if (modal) {
    // Replace the modal content.
    modal.replaceWith(template.content.firstChild);
  } else {
    // Attach the template to the body.
    const body = [...document.getElementsByTagName("body")][0];
    body.appendChild(template.content.firstChild);
  }

  // Make the modal visible, if it isn't already.
  const node = document.getElementById(ID_PREFIX + "onboarding-container");
  node?.style.setProperty("opacity", "1");
  node?.style.setProperty("visibility", "visible");

  // Add the option to close the modal.
  const close = document.getElementById(ID_PREFIX + "onboarding-close");
  const done = document.getElementById(ID_PREFIX + "onboarding-done");
  close?.addEventListener("click", hideOnboarding, false);
  done?.addEventListener("click", hideOnboarding, false);

  // Navigate to the next step when clicking the next button.
  const next = document.getElementById(ID_PREFIX + "onboarding-next");
  next?.addEventListener("click", () => showOnboarding(++step), false);

  // Navigate back a step when clicking the back button.
  const back = document.getElementById(ID_PREFIX + "onboarding-back");
  back?.addEventListener("click", () => showOnboarding(--step), false);
}

function injectPopup() {
  //
  // Only inject the modal if it doesn't already exist.
  //
  const modal = document.getElementById(ID_PREFIX + "popup");

  if (modal) {
    return;
  }

  // The HTML for the modal.
  const html = `
<div id="${ID_PREFIX}popup-container">
	<div id="${ID_PREFIX}popup">
		<h2>Welcome!</h2>
		<button id="${ID_PREFIX}close">&times;</button>
		<div id="#${ID_PREFIX}content">
      <p>TwitRep uses the PageRank algorithm and natural language processing to help you find out who knows what.</p>
      <p>TwitRep is currently an experimental product. If you have any questions or concerns, send an email to <a href="mailto:hello@replabs.xyz">hello@replabs.xyz.</a></p>
		</div>
	</div>
</div>`.trim();

  // Create the HTML template.
  const template = document.createElement("template");

  // Find the body node.
  const body = [...document.getElementsByTagName("body")][0];

  // Add the modal HTML to the template.
  template.innerHTML = html;

  // Add the html modal to the body.
  body.appendChild(template.content.firstChild);

  // Add the option to close the modal.
  document
    .getElementById(ID_PREFIX + "close")
    ?.addEventListener("click", hidePopup, false);
}

function addLocationObserver(callback) {
  //
  // Verify that the current page is twitter.
  //
  const twitter = "https://twitter.com/";
  const href = window.location.href;

  if (!href.startsWith(twitter)) {
    return;
  }

  // Options for the observer (which mutations to observe)
  const config = {
    attributes: false,
    childList: true,
    subtree: true,
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(document.body, config);
}

async function observerCallback() {
  //
  // Verify that the current page is twitter.
  //
  const twitter = "https://twitter.com/";
  const href = window.location.href;

  if (!href.startsWith(twitter)) {
    return;
  }
  //
  // Verify that the user is logged in.
  //
  const data = await chrome.storage.local.get("credentials");

  if (!data.credentials) {
    return;
  }

  // Inject the popup modal, if it is not already shown.
  injectPopup();

  if (href.startsWith(twitter + "home") || href.startsWith(twitter + "i")) {
    // Home screen or list.
    addReputationBadgesToTimeline();
  } else if (
    href.startsWith(twitter) &&
    !href.replace(twitter, "").includes("/")
  ) {
    // User profile.
    addReputationCardsToProfile();
  }
}

// Register the observers.
addLocationObserver(observerCallback);
observerCallback();

// Inject the onboarding content.
showOnboarding(0);

// Register the event listener.
// chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
//   console.log("received message");
//   if (message.type == "SHOW_ONBOARDING") {
//     console.log("received onboarding message");
//     showOnboarding(message);
//   }

//   sendResponse();
// });
