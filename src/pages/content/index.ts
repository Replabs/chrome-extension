console.info("content loaded");

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
    const view = document.getElementById("twitter-chrome-extension-cards");

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
  const view = document.getElementById("twitter-chrome-extension-cards");

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
      [...container.children].filter(
        (c) => c.className == "twitter-chrome-extension-badges"
      ).length > 0;

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
  view.className = "twitter-chrome-extension-badges";

  // Append a badge view for each badge.
  for (const badge of badges) {
    const badgeContainer = document.createElement("div");
    badgeContainer.className = "twitter-chrome-extension-badge";

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
  profiles.className = "twitter-chrome-extension-profile-container";

  for (let i = 0; i < 3; i++) {
    const img = document.createElement("img");

    img.src = users[i].profile_image_url;
    img.className = "twitter-chrome-extension-profile-img";

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
  view.id = "twitter-chrome-extension-cards";

  // Append a card view for each card object to the container.
  for (const card of cards) {
    // The container of the card content.
    const cardContainer = document.createElement("div");
    cardContainer.className = "twitter-chrome-extension-card";
    cardContainer.addEventListener("click", showPopup, false);
    console.log("added event listener to card");
    view.appendChild(cardContainer);

    // The title of the card.
    const h4 = document.createElement("h4");
    h4.innerText = card.keyword;

    // The row of the profile images and description of the card.
    const row = document.createElement("div");
    row.className = "twitter-chrome-extension-row";
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

function showPopup() {
  console.log("INside show popup!!");
  const popup = document.getElementById(
    "twitter-chrome-extension-popup-container"
  );

  console.log(popup);

  popup?.style.setProperty("opacity", "1");
  popup?.style.setProperty("visibility", "visible");
}

function hidePopup() {
  console.log("INside hide popup!!");
  const popup = document.getElementById(
    "twitter-chrome-extension-popup-container"
  );

  console.log(popup);

  popup?.style.setProperty("opacity", "0");
  popup?.style.setProperty("visibility", "hidden");
}

function injectModal() {
  //
  // Only inject the modal if it doesn't already exist.
  //
  const modal = document.getElementById("twitter-chrome-extension-popup");

  if (modal) {
    return;
  }

  // The HTML for the modal.
  const html = `
<div id="twitter-chrome-extension-popup-container">
	<div id="twitter-chrome-extension-popup">
		<h2>What's this?</h2>
		<button id="twitter-chrome-extension-close">&times;</button>
		<div id="#twitter-chrome-extension-content">
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
    .getElementById("twitter-chrome-extension-close")
    ?.addEventListener("click", hidePopup, false);
}

function addLocationObserver(callback) {
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
  // Verify that the user is logged in.
  //
  const data = await chrome.storage.local.get("credentials");

  if (!data.credentials) {
    return;
  }

  // console.log("Observer callback");

  const twitter = "https://twitter.com/";
  const href = window.location.href;

  if (!href.startsWith(twitter)) {
    return;
  }

  // Inject the popup modal, if it is not already shown.
  injectModal();

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
