export const GET_MEDIA_DETAILS_QUERY = `
  query GetMediaDetails($id: Int!) {
    Media(id: $id) {
      id type format status description(asHtml: true)
      title { english romaji native } synonyms
      coverImage { extraLarge large color } bannerImage
      startDate { year month day } endDate { year month day }
      season seasonYear episodes duration chapters volumes genres
      averageScore popularity isAdult source countryOfOrigin
      trailer { id site thumbnail }

      # NEW: Tags for thematic discovery
      tags { id name description rank isMediaSpoiler }

      # NEW: External Links for "Where to Watch" / Official Sites
      externalLinks { id url site icon color }

      # NEW: Airing Schedule Intelligence
      nextAiringEpisode { episode airingAt timeUntilAiring }
      airingSchedule(notYetAired: true) {
        nodes { episode airingAt timeUntilAiring }
      }

      studios(sort: [FAVOURITES_DESC]) {
        edges { isMain node { id name isAnimationStudio } }
      }

      # UPDATED: Removed 'language: JAPANESE' to fetch global dub languages
      characters(sort: [ROLE, RELEVANCE], page: 1, perPage: 25) {
        pageInfo { total hasNextPage }
        edges {
          role
          voiceActors(sort: [RELEVANCE]) {
            id name { full } image { large } languageV2
          }
          node { id name { full } image { large } }
        }
      }

      # NEW: Production Staff
      staff(sort: [RELEVANCE], page: 1, perPage: 12) {
        pageInfo { total hasNextPage }
        edges {
          role
          node { id name { full } image { large } }
        }
      }

      # UPDATED: Expanded to feed the canonical MediaCard schema
      relations {
        edges {
          relationType(version: 2)
          node { 
            id type format status episodes chapters volumes season seasonYear averageScore popularity
            title { english romaji native } 
            coverImage { extraLarge large color } bannerImage 
          }
        }
      }

      # NEW: Recommendations for "You May Also Like"
      recommendations(sort: [RATING_DESC], page: 1, perPage: 12) {
        pageInfo { total hasNextPage }
        edges {
          node {
            rating
            mediaRecommendation {
              id type format status episodes chapters volumes season seasonYear averageScore popularity
              title { english romaji native }
              coverImage { extraLarge large color } bannerImage
            }
          }
        }
      }
    }
  }
`;
