export const GET_MEDIA_DETAILS_QUERY = `
  query GetMediaDetails($id: Int!) {
    Media(id: $id) {
      id type format status description(asHtml: true)
      title { english romaji native } synonyms
      coverImage { extraLarge large color } bannerImage
      startDate { year month day } endDate { year month day }
      season seasonYear episodes duration chapters volumes genres
      averageScore popularity isAdult
      trailer { id site thumbnail }
      
      studios(sort: [FAVOURITES_DESC]) {
        edges { isMain node { id name isAnimationStudio } }
      }
      
      characters(sort: [ROLE, RELEVANCE], page: 1, perPage: 12) {
        pageInfo { total hasNextPage }
        edges {
          role
          voiceActors(language: JAPANESE, sort: [RELEVANCE]) {
            id name { full } image { large } languageV2
          }
          node { id name { full } image { large } }
        }
      }
      
      relations {
        edges {
          relationType(version: 2)
          node { id type title { english romaji } coverImage { large } format status }
        }
      }
    }
  }
`;
