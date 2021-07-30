module.exports = ({ dockerOrg, imageName, releaseBranch }) =>
  `name: Build Dockerfile
on:
  push:
    branches:
      - ${releaseBranch}
  pull_request:
    branches:
      - "*"
jobs:
  publish:
    if: "!contains(github.event.head_commit.message, 'skip ci')"
    name: Release
    runs-on: ubuntu-20.04
    steps:
      - name: Checkout
        uses: actions/checkout@v2
      - name: Login to container registry
        run: docker/login-action@v1
        with:
          username: \${{ secrets.REGISTRY_USERNAME }}
          password: \${{ secrets.REGISTRY_PASSWORD }}
      - name: Build Dockerfile
        run: |
          docker build -t $DOCKER_ORG/$DOCKER_IMAGE_NAME:$BRANCH .
          docker tag $DOCKER_ORG/$DOCKER_IMAGE_NAME:$BRANCH $DOCKER_ORG/$DOCKER_IMAGE_NAME:\${{ github.sha }}
          docker push $DOCKER_ORG/$DOCKER_IMAGE_NAME:$BRANCH
          docker push $DOCKER_ORG/$DOCKER_IMAGE_NAME:\${{ github.sha }}
        env:
          DOCKER_ORG: "${dockerOrg}"
          DOCKER_IMAGE_NAME: "${imageName}"
          BRANCH: \${{ github.event.pull_request.head.ref || 'latest' }}`
