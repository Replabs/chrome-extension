console.info("content loaded");

/**
 * @description
 * Chrome extensions don't support modules in content scripts.
 */

function capitalizeFirstLetter(string) {
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
      console.log(users);
      for (const user of users) {
        if (user == username) {
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
  console.log("inside reps badge to timeline");
  //
  // Fetch the results from storage or API.
  //

  console.log("foo");
  await chrome.runtime.sendMessage({ type: "RESULTS" });
  console.log("bar");
  const data = await chrome.storage.local.get("results");
  console.log("do");
  const results = data.results;

  console.log(results);

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
          otherUsers: users.filter((u: string) => u != user),
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

    console.log(a);

    // The href property of the a tag for the user link is /:username.
    const username = a?.getAttribute("href")?.replace("/", "");

    console.log(username);

    const badgesToDisplay = badges.filter((b) => b.user == username);

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
    user: string;
    list: string;
    otherUsers: string[];
  }[]
) {
  const view = document.createElement("div");
  view.className = "twitter-chrome-extension-badges";

  // Append a badge view for each badge.
  for (const badge of badges) {
    const badgeContainer = document.createElement("div");
    badgeContainer.className = "twitter-chrome-extension-badge";

    // Add the profiles.
    badgeContainer.appendChild(createProfilesView());

    // Add the badge text.
    const name = document.createElement("p");
    name.innerText = `${badge.list} • ${badge.keyword}`;
    badgeContainer.appendChild(name);

    // Append the badge to the container.
    view.appendChild(badgeContainer);
  }

  return view;
}

function createProfilesView() {
  const profiles = document.createElement("div");
  profiles.className = "twitter-chrome-extension-profile-container";

  for (let i = 0; i < 3; i++) {
    const img = document.createElement("img");
    img.src =
      "https://pbs.twimg.com/profile_images/1552594337464307713/ZloMEOAw_400x400.jpg";
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
    user: string;
    list: string;
    otherUsers: string[];
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
    view.appendChild(cardContainer);

    // The title of the card.
    const h4 = document.createElement("h4");
    h4.innerText = card.keyword;

    // The row of the profile images and description of the card.
    const row = document.createElement("div");
    row.className = "twitter-chrome-extension-row";
    cardContainer.appendChild(h4);
    cardContainer.appendChild(row);

    row.appendChild(createProfilesView());

    // The text of the card.
    const text = document.createElement("p");
    text.innerHTML = `<strong>${card.user}</strong> seems knowledgable about <strong>${card.keyword}</strong> to people in <strong>${card.list}</strong>.`;
    row.appendChild(text);
  }

  // Return the view.
  return view;
}

function addLocationObserver(callback) {
  // Options for the observer (which mutations to observe)
  const config = { attributes: false, childList: true, subtree: false };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(document.body, config);
}

const isCallingCards = false;
const isCallingBadges = false;

async function observerCallback() {
  if (window.location.href.startsWith("https://twitter.com/")) {
    // This function internally checks that the route is indeed a user profile.
    // if (!isCallingCards) {
    //   isCallingCards = true;
    addReputationCardsToProfile();
    // isCallingCards = false;
    // }

    // This function internally checks that the route is indeed a timeline.
    // if (!isCallingBadges) {
    //   isCallingBadges = true;
    addReputationBadgesToTimeline();
    // isCallingBadges = false;
    // }
  }
}

addLocationObserver(observerCallback);
observerCallback();
