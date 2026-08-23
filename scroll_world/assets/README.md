# assets/

이 프로젝트는 **외부 에셋을 사용하지 않습니다.**

- 모든 텍스처(별, 글로우, 라벨, 대시보드 차트)는 `<canvas>`로 런타임에 절차 생성됩니다.
  - 생성 코드: `src/particles.js`의 `makeSoftCircleTexture`, `src/scene.js`의 `makeLabelSprite` / `makeDashboardTexture`
- 모든 3D 형태는 Three.js 기본 지오메트리(Box, Icosahedron, Torus, Extrude 등)로 만듭니다.

추후 이미지/폰트/모델(GLB 등)을 추가할 경우 이 폴더에 두고 사용하세요.
