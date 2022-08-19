/**
 * Adds reputation cards and badges to profiles and tweets.
 */

const prefix = "twitrep-";

// Used to throttle the script.
let isThrottling = false;

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
  const data = await chrome.storage.local.get("results");
  const results = data.results;

  if (!results?.lists) {
    return;
  }

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
    const view = document.getElementById(prefix + "cards");

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
  const view = document.getElementById(prefix + "cards");

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
  // Fetch the results from storage.
  //
  const data = await chrome.storage.local.get("results");
  const results = data.results;

  if (!results?.lists) {
    return;
  }

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
      [...container.children].filter((c) => c.className == prefix + "badges")
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
    user: { name: string; top_tweets: string[] };
    list: string;
    otherUsers: [{ profile_image_url: string }];
  }[]
) {
  const view = document.createElement("div");
  view.className = prefix + "badges";

  // Append a badge view for each badge.
  for (const badge of badges) {
    const badgeContainer = document.createElement("div");
    badgeContainer.className = prefix + "badge";

    // Add the profiles.
    badgeContainer.appendChild(createProfilesView(badge.otherUsers));
    badgeContainer.addEventListener(
      "click",
      (e: Event) => showPopup(e, badge.keyword, badge.user),
      false
    );

    // Add the badge text.
    const name = document.createElement("p");
    name.innerText = `${badge.list} • ${badge.keyword}`;
    badgeContainer.appendChild(name);

    // Append the badge to the container.
    view.appendChild(badgeContainer);
  }

  return view;
}

/**
 * Create a view with three circular profile images
 * from the provided urls.
 */
function createProfilesView(users: [{ profile_image_url: string }]) {
  const profiles = document.createElement("div");
  profiles.className = prefix + "profile-container";

  for (let i = 0; i < 3; i++) {
    const img = document.createElement("img");

    img.src = users[i].profile_image_url;
    img.className = prefix + "profile-img";

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
    user: { name: string; top_tweets: string[] };
    list: string;
    otherUsers: [{ profile_image_url: string }];
  }[]
) {
  // Create a container for the cards.
  const view = document.createElement("div");
  view.id = prefix + "cards";

  // Append a card view for each card object to the container.
  for (const card of cards) {
    // The container of the card content.
    const cardContainer = document.createElement("div");
    cardContainer.className = prefix + "card";
    cardContainer.addEventListener(
      "click",
      (e: Event) => showPopup(e, card.keyword, card.user),
      false
    );
    view.appendChild(cardContainer);

    // The title of the card.
    const h4 = document.createElement("h4");
    h4.innerText = card.keyword;

    // The row of the profile images and description of the card.
    const row = document.createElement("div");
    row.className = prefix + "row";
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

function hidePopup(e?: Event) {
  e?.stopPropagation();

  const popup = document.getElementById(prefix + "popup-container");

  // Remove any links added to the popup.
  document.getElementById(prefix + "links")?.remove();

  popup?.style.setProperty("opacity", "0");
  popup?.style.setProperty("visibility", "hidden");
}

function showPopup(e?: Event, type?: string, user?: { top_tweets: string[] }) {
  e?.stopPropagation();

  const popup = document.getElementById(prefix + "popup-container");

  // Add links to the popup.
  if (user?.top_tweets) {
    const div = document.createElement("div");
    div.id = prefix + "links";

    const p = document.createElement("p");
    p.textContent = `Some of the tweets indicating trustworthiness${
      type ? " in " + type : ""
    } are:`;
    div.appendChild(p);

    for (const tweet of user.top_tweets) {
      const a = document.createElement("a");
      a.href = tweet;
      a.text = tweet;
      a.className = `${prefix}-link truncate`;
      div.appendChild(a);
    }

    document.getElementById(prefix + "content")?.appendChild(div);
  }

  popup?.style.setProperty("opacity", "1");
  popup?.style.setProperty("visibility", "visible");
}

function injectPopup() {
  //
  // Only inject the modal if it doesn't already exist.
  //
  const modal = document.getElementById(prefix + "popup");

  if (modal) {
    return;
  }

  // The HTML for the modal.
  const html = `
<div id="${prefix}popup-container">
	<div id="${prefix}popup">
		<h2>What's this?</h2>
		<button id="${prefix}close">&times;</button>
		<div id="${prefix}content">
      <p>TwitRep uses the PageRank algorithm and natural language processing to help you find out who knows what.</p>
      <p>TwitRep is currently an experimental product. If you have any questions or concerns, send an email to <a href="mailto:hello@replabs.xyz">hello@replabs.xyz.</a></p>
		</div>
	</div>
</div>`.trim();

  // Create the HTML template.
  const template = document.createElement("template");
  template.innerHTML = html;

  // Add the html modal to the body.
  document.body.appendChild(template.content.firstChild);

  // Add the option to close the modal.
  const close = document.getElementById(prefix + "close");
  close?.addEventListener("click", hidePopup, false);
}

/**
 * Listen for changes in the DOM if needed.
 */
async function addLocationObserver(callback) {
  //
  // Verify that the user is logged in.
  //
  const data = await chrome.storage.local.get("credentials");

  if (!data.credentials) {
    return;
  }

  //
  // Verify that the user has completed the onboarding flow. Otherwise,
  // show the flow from where the user dropped of.
  //
  const onboarding = await chrome.storage.local.get("onboarding");
  if (!onboarding?.onboarding?.done) {
    // Send a message to the onboarding content script.
    chrome.runtime.sendMessage({ type: "SHOW_ONBOARDING" });

    return;
  }

  //
  // Verify valid results exist.
  //
  await chrome.runtime.sendMessage({ type: "RESULTS" });

  const results = await chrome.storage.local.get("results");

  if (!results?.results) {
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

  // Call the callback.
  callback();
}

/**
 * The callback called when the DOM changes.
 */
async function observerCallback() {
  if (isThrottling) {
    return false;
  }

  isThrottling = true;

  setTimeout(() => {
    isThrottling = false;
  }, 1000);

  const twitter = "https://twitter.com/";
  const href = window.location.href;

  const isHome = href.startsWith(twitter + "home");
  const isList = href.startsWith(twitter + "i");

  const isTimeline = isHome || isList;

  const isProfile =
    href.startsWith(twitter) &&
    !href.replace(twitter, "").includes("/") &&
    !isTimeline;

  if (isTimeline) {
    await addReputationBadgesToTimeline();
  }

  if (isProfile) {
    await addReputationCardsToProfile();
  }
}

// Register the observers.
addLocationObserver(observerCallback);

// Inject the popup.
injectPopup();

///
///
///
/// ONBOARDING
/// -----------------
/// Below is the code for the onboarding flow, shown as a popup.
///
///

function id(str: string) {
  return "twitrep-onboarding-" + str;
}

function hideOnboarding(e?: Event) {
  e?.stopPropagation();

  const modal = document.getElementById(id("container"));

  modal?.style.setProperty("opacity", "0");
  modal?.style.setProperty("visibility", "hidden");
}

function onInput(e?: Event) {
  const next = document.getElementById(id("next"));

  if (e && (e?.target as HTMLTextAreaElement).value) {
    next.classList.remove("disabled");
  } else {
    next.classList.add("disabled");
  }
}

/**
 * Get the template HTML for the current step.
 */
function getOnboardingHtml(step: number, lists = []) {
  console.log(step);
  if (step == 0) {
    // The HTML for the modal.
    return `
     <div id="${id("container")}">
       <div id="twitrep-onboarding">
         <h2>Welcome!</h2>
         <button id="${id("close")}">&times;</button>
         <div id="${id("content")}">
           <p>TwitRep is an experimental multi-dimensional reputation system built for Twitter. It uses conversations between people in lists to determine who seem trustworthy. This is done using the PageRank algorithm and natural language processing.</p>
           <p>You will be asked to select which lists and areas you want to use TwitRep for.</p>
         </div>
         <div id="${id("next-row")}">
           <button id="${id("next")}">Next</button>
         </div>
       </div>
     </div>`;
  } else if (step == 1) {
    let labels = "";

    for (const list of lists) {
      labels += `
           <label class="${id("checkbox-container")}">${list.name}
             <input class="${id("checkbox")}" type="checkbox" value="${
        list.id
      }">
             <span class="${id("checkmark")}"></span>
           </label>
         `;
    }

    return `
       <div id="${id("container")}">
        <div id="twitrep-onboarding">
           <h2>Which lists would you like to analyze?</h2>
           <button id="${id("close")}">&times;</button>
           <div id="${id("content")}">
             ${labels}
           </div>
           <div id="${id("next-row")}">
             <button id="${id("back")}">Back</button>
             <button id="${id("next")}">Next</button>
           </div>
         </div>
       </div>`;
  } else if (step == 2) {
    return `
       <div id="${id("container")}">
         <div id="twitrep-onboarding">
           <h2>What type of reputation are you interested in?</h2>
           <button id="${id("close")}">&times;</button>
           <div id="${id("content")}">
             <p>Add an area where you struggle to know who you can trust on Twitter.</p>
             <div>
               <input id="${id("type")}" type="text" autocapitalize="word" />
             </div>
           </div>
           <div id="${id("next-row")}">
             <button id="${id("back")}">Back</button>
             <button id="${id("next")}" class="disabled">Next</button>
           </div>
         </div>
       </div>`;
  } else {
    return `
       <div id="${id("container")}">
         <div id="twitrep-onboarding" class="final">
           <svg width="240" height="240" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path fill-rule="evenodd" clip-rule="evenodd" d="M106.236 0.511132C104.861 0.759632 102.274 1.19013 100.486 1.46813C88.405 3.34613 77.1715 7.04763 65.7365 12.9181C53.937 18.9761 44.6345 25.7596 35.2295 35.1651C18.3915 52.0026 7.63 71.7196 2.477 95.1721C2.2355 96.2721 1.7915 98.7471 1.4905 100.672C1.19 102.597 0.7285 105.423 0.465 106.952C-0.155 110.555 -0.155 129.289 0.465 132.892C0.7285 134.421 1.19 137.247 1.4905 139.172C2.419 145.112 3.7585 150.782 5.686 156.927C7.9385 164.11 13.3765 175.732 17.965 183.172C26.9285 197.705 42.2035 212.98 56.7365 221.944C67.135 228.357 80.21 233.923 90.6115 236.365C95.5635 237.527 97.3385 237.887 100.736 238.418C102.661 238.719 105.487 239.18 107.016 239.444C110.619 240.064 129.353 240.064 132.956 239.444C134.485 239.18 137.311 238.719 139.236 238.418C145.176 237.49 150.846 236.15 156.991 234.223C164.174 231.97 175.796 226.532 183.236 221.944C197.769 212.98 213.045 197.705 222.008 183.172C228.392 172.821 234.034 159.585 236.394 149.422C237.669 143.931 237.967 142.466 238.482 139.172C238.783 137.247 239.245 134.421 239.508 132.892C240.128 129.289 240.128 110.555 239.508 106.952C239.245 105.423 238.783 102.597 238.482 100.672C237.109 91.8851 235.045 84.3551 231.697 75.9176C225.707 60.8211 216.539 46.9601 204.743 35.1651C198.319 28.7401 190.053 22.1051 183.236 17.9006C172.885 11.5166 159.649 5.87413 149.486 3.51463C143.995 2.23963 142.53 1.94113 139.236 1.42613C137.311 1.12563 134.485 0.664132 132.956 0.400632C129.53 -0.189368 109.66 -0.106868 106.236 0.511132ZM173.219 87.4051L182.192 96.3886L178.218 100.53C174.853 104.038 160.191 119.005 115.016 165.047C111.036 169.103 107.657 172.419 107.508 172.415C107.247 172.409 103.612 168.947 89.9865 155.729C71.7765 138.065 62.9865 129.371 62.9865 129.023C62.9865 128.81 67.039 124.606 71.992 119.68L80.998 110.725L83.117 112.736C84.283 113.843 87.4835 116.868 90.2295 119.46C92.9755 122.052 97.348 126.197 99.9455 128.672C102.543 131.147 105.2 133.678 105.85 134.297C106.5 134.916 107.199 135.422 107.404 135.422C107.803 135.422 112.128 131.059 143.003 99.5026C153.856 88.4091 162.811 79.1281 162.903 78.8776C163.316 77.7491 164.799 78.9751 173.219 87.4051Z" fill="#479BE9"/>
           </svg>
           <h2>All Good!</h2>
           <div id="${id("content")}">
             <p>Reputation is being calculated in the background.</p>
           </div>
           <button id="${id("next")}">Done</button>
         </div>
       </div>`;
  }
}

async function showOnboarding() {
  const data = await chrome.storage.local.get("onboarding");
  const onboarding = data.onboarding;

  if (!onboarding) {
    return;
  }

  const modal = document.getElementById(id("container"));

  // Create the HTML template.
  const template = document.createElement("template");
  template.innerHTML = getOnboardingHtml(
    onboarding.step,
    onboarding.lists
  ).trim();

  if (modal) {
    // Replace the modal content.
    modal.replaceWith(template.content.firstChild);
  } else {
    // Attach the template to the body.
    document.body.appendChild(template.content.firstChild);
  }

  // Make the modal visible, if it isn't already.
  const node = document.getElementById(id("container"));
  node?.style.setProperty("opacity", "1");
  node?.style.setProperty("visibility", "visible");

  // Add the option to close the modal.
  const close = document.getElementById(id("close"));
  const done = document.getElementById(id("done"));
  close?.addEventListener("click", hideOnboarding, false);
  done?.addEventListener("click", hideOnboarding, false);

  // Update the state of the next button on the input step.
  const input = document.getElementById(id("type"));
  input?.addEventListener("input", onInput, false);

  const onNext = async () => {
    const next = document.getElementById(id("next"));

    if (next.classList.contains("disabled")) {
      return;
    }

    if (onboarding.step == 1) {
      // Get the list IDs from the checked checkbox values.
      const ids = Array.from(
        document.querySelectorAll(`input[class='${id("checkbox")}']:checked`),
        (e: HTMLInputElement) => e.value
      );

      // Update the onboarding info.
      onboarding.selectedLists = ids;
    } else if (onboarding.step == 2) {
      // Set the reputation type to the input field's value.
      const input = document.getElementById(id("type"));
      onboarding.type = (input as HTMLInputElement)?.value;
      onboarding.done = true;

      // Send a message to the background script to start crawling tweets for the user's lists.
      chrome.runtime.sendMessage({
        type: "ONBOARDING_FINISHED",
        onboarding: onboarding,
      });
    } else if (onboarding.step == 3) {
      hideOnboarding();
      return;
    }

    // Go to the next onboarding step.
    onboarding.step++;

    // Update the onboarding info.
    await chrome.storage.local.set({ onboarding: onboarding });

    showOnboarding();
  };

  const onBack = async () => {
    onboarding.step--;
    await chrome.storage.local.set({ onboarding: onboarding });
    showOnboarding();
  };

  // Navigate to the next step when clicking the next button.
  const next = document.getElementById(id("next"));
  next?.addEventListener("click", onNext, false);

  // Navigate back a step when clicking the back button.
  const back = document.getElementById(id("back"));
  back?.addEventListener("click", onBack, false);
}

// Register the event listener.
chrome.runtime.onMessage.addListener((message) => {
  if (message.type == "SHOW_ONBOARDING") {
    showOnboarding();
  }

  return true;
});
