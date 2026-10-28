/* global quiz, exam */
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Tier-2 Agentic Browser Harness (Layout Geometry · SPA E2E · Zero-Hint · A11y)', () => {
  test('모바일(360px, 375px) 및 데스크톱(1280px) 전 뷰 가로 넘침 0px 및 레이아웃 좌표(boundingBox) 불변식 검증', async ({ page }) => {
    const viewports = [
      { name: 'compact-mobile-360', width: 360, height: 740, isMobile: true },
      { name: 'standard-mobile-375', width: 375, height: 812, isMobile: true },
      { name: 'desktop-1280', width: 1280, height: 800, isMobile: false }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/#study');

      // 1) 상단 5개 탭 모두가 화면 좌우 경계 내부에 잘림 없이 배치되는지 검증
      const navButtons = page.locator('header nav button[data-nav]');
      await expect(navButtons).toHaveCount(5);
      for (let i = 0; i < 5; i++) {
        const box = await navButtons.nth(i).boundingBox();
        expect(box, `${vp.name}: nav button ${i} boundingBox 존재`).not.toBeNull();
        expect(box.x, `${vp.name}: nav button ${i} 좌측 경계`).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width, `${vp.name}: nav button ${i} 우측 경계 미초과`).toBeLessThanOrEqual(vp.width + 1);
      }

      // 2) 모바일 뷰포트에서 .intro 제목 블록과 .intro-actions가 수직 적재(column)되는지 좌표 검증
      if (vp.isMobile) {
        const titleBox = await page.locator('.intro > div').first().boundingBox();
        const actionsBox = await page.locator('.intro-actions').boundingBox();
        expect(titleBox).not.toBeNull();
        expect(actionsBox).not.toBeNull();
        expect(actionsBox.y, `${vp.name}: .intro-actions는 제목 블록 아래에 수직 배치되어야 함`).toBeGreaterThanOrEqual(
          titleBox.y + titleBox.height - 2
        );
        expect(actionsBox.x + actionsBox.width, `${vp.name}: .intro-actions 우측 경계 미초과`).toBeLessThanOrEqual(vp.width + 1);
      }

      // 3) 5대 뷰(study, quiz, exam, wrong, stats) 순차 전환 시 가로 스크롤(overflow-x) 0px 검증
      for (const nav of ['study', 'quiz', 'exam', 'wrong', 'stats']) {
        await page.locator(`header nav button[data-nav="${nav}"]`).click();
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });
        expect(overflow, `${vp.name} 뷰포트 [${nav}] 탭에서 가로 넘침이 없어야 함`).toBe(false);
      }

      // 4) 상세 모달(#detail) 오픈 시 가로 넘침 0px 검증
      await page.locator('header nav button[data-nav="study"]').click();
      await page.locator('[data-tree="1"]').click();
      await expect(page.locator('#detail')).toBeVisible();
      const modalOverflow = await page.evaluate(() => {
        const dlg = document.querySelector('#detail');
        return dlg.scrollWidth > window.innerWidth;
      });
      expect(modalOverflow, `${vp.name} 뷰포트 상세 모달 가로 넘침 없어야 함`).toBe(false);
      await page.locator('#detail .close').click();
    }
  });

  test('SPA 라우팅 · 모달 연속 탐색 후 뒤로 가기 1회 닫기(pushState/replaceState) · 포커스 복원 E2E 검증', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/#study');

    // 001번 카드 클릭 -> #tree-001 (pushState)
    await page.locator('[data-tree="1"]').click();
    await expect(page).toHaveURL(/#tree-001$/);
    await expect(page.locator('#detail')).toBeVisible();

    // 모달 내부에서 다음 수목(002번 가시나무) 이동 -> #tree-002 (replaceState)
    await page.locator('#next-tree').click();
    await expect(page).toHaveURL(/#tree-002$/);
    await expect(page.locator('#detail h2')).toContainText('가시나무');

    // 브라우저 뒤로 가기 단 1회 실행 시 모달이 즉시 닫히고 2번 카드로 포커스가 복원되어야 함
    await page.goBack();
    await expect(page.locator('#detail')).toBeHidden();
    await expect(page).toHaveURL(/#study$/);
    await expect.poll(async () => page.evaluate(() => document.activeElement?.getAttribute('data-tree'))).toBe('2');
  });

  test('도메인 불변식: 랜덤 퀴즈 & 20선 실전 모의고사 Zero-Hint 스포일러 차단 및 표준명 엄격 채점 E2E 검증', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/#quiz');

    // 1) 랜덤 퀴즈(직접 쓰기 모드) 시작 및 Zero-Hint 검증
    await page.locator('input[name="mode"][value="typing"]').check();
    await page.locator('#quiz-form button[type="submit"]').click();
    await expect(page.locator('.quiz-photos-grid')).toBeVisible();

    const quizLeak = await page.evaluate(() => {
      const q = quiz.questions[quiz.index].tree;
      const text = document.querySelector('#main').innerText;
      return (
        text.includes(q.name) ||
        text.includes(q.scientificName) ||
        text.includes(q.points[0])
      );
    });
    expect(quizLeak, '퀴즈 풀이 화면에 정답 수목명·학명·감별포인트가 노출되면 안 됨').toBe(false);

    // 2) 실전 모의고사 시작 및 세션 이탈 보호 가드(confirm) 검증
    await page.goto('/#exam');
    await page.locator('#exam-form button[type="submit"]').click();
    await expect(page.locator('.exam-workspace')).toBeVisible();

    // 모의고사 진행 중 다른 탭 클릭 시 이탈 방지 confirm 가드 작동 확인 (취소하여 모의고사 유지)
    let guardTriggered = false;
    page.once('dialog', async dialog => {
      guardTriggered = true;
      await dialog.dismiss();
    });
    await page.locator('header nav button[data-nav="study"]').click();
    expect(guardTriggered, '모의고사 진행 중 탭 전환 시 세션 보호 confirm이 호출되어야 함').toBe(true);
    await expect(page.locator('.exam-workspace')).toBeVisible();

    // 모의고사 Zero-Hint(부위 배지 및 정답 텍스트 완전 배제) 검증
    await expect(page.locator('.quiz-photo-badge')).toHaveCount(0);
    const examLeak = await page.evaluate(() => {
      const curTree = exam.questions[exam.qIndex].tree;
      const text = document.querySelector('#main').innerText;
      return text.includes(curTree.name) || text.includes(curTree.scientificName);
    });
    expect(examLeak, '실전 모의고사 상영 화면에 수목명이나 학명이 노출되면 안 됨').toBe(false);

    // 모의고사 표준명('곰솔' -> 0.5점 정답) vs 별칭('해송' -> 0점 오답 + 주의 안내) 채점 검증
    await page.evaluate(() => {
      const gomsol = window.TREES.find(t => t.id === 11);
      exam.questions[1].tree = gomsol;
      exam.questions[2].tree = gomsol;
    });
    await page.locator('#sheet-input-1').fill('곰솔');
    await page.locator('#sheet-input-2').fill('해송');

    page.once('dialog', dialog => dialog.accept());
    await page.locator('#exam-submit-bottom').click();

    await expect(page.locator('.exam-score-card')).toBeVisible();
    await expect(page.locator('.exam-alias-alert')).toContainText('표준수종 명칭 주의 안내');
    await expect(page.locator('.exam-score-main strong')).toContainText('0.5');
  });

  test('WCAG 웹 접근성(Axe-core) 주요 뷰 및 상세 모달 자동 감사', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/#study');

    // 색상 대비(color-contrast)를 제외한 핵심 구조/ARIA/레이블/대체텍스트 규칙 위반 0건 검증
    const studyScan = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze();
    expect(studyScan.violations, '수목 도감(#study) 접근성 위반 없음').toEqual([]);

    await page.locator('[data-tree="1"]').click();
    await expect(page.locator('#detail')).toBeVisible();
    const modalScan = await new AxeBuilder({ page })
      .include('#detail')
      .disableRules(['color-contrast'])
      .analyze();
    expect(modalScan.violations, '상세 모달(#detail) 접근성 위반 없음').toEqual([]);
  });
});
