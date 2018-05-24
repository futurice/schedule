from django.contrib.staticfiles.testing import StaticLiveServerTestCase
from django.core.urlresolvers import reverse
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from selenium.webdriver.chrome.options import Options


class BasicFirefox(StaticLiveServerTestCase):
    # react-tools bundles assets, nginx serves
    live_server_url = 'http://localhost:8000'
    """
    Define the unit tests and use Firefox.

    To use another browser, subclass this and override newDriver().
    """

    @staticmethod
    def newDriver():
        """
        Override this method in subclasses to use other browsers.
        """
        return webdriver.Firefox()

    @classmethod
    def setUpClass(cls):
        cls.driver = cls.newDriver()
        super(BasicFirefox, cls).setUpClass()

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()
        super(BasicFirefox, cls).tearDownClass()

    def url(self, path):
        """
        Return the full URL (http://server/path) for the absolute path.
        """
        return '{}{}'.format(self.live_server_url, path)


    def test_index(self):
        self.driver.get(self.url(reverse('index')))
        self.assertEqual('Schedule', self.driver.title)

    def test_javascript_unit_tests(self):
# TODO: find out why liveserver is not working
#        self.driver.get(self.url(reverse('test')))
        self.driver.get('http://localhost:8000/test/')
        selector = 'h2#qunit-banner.qunit-fail, h2#qunit-banner.qunit-pass'
        elem = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
        self.assertEqual(elem.get_attribute('class'), 'qunit-pass')


class BasicChromium(BasicFirefox):

    @staticmethod
    def newDriver():
        if os.getenv('TRAVIS') == 'true':
            options = Options()
            options.add_argument("--no-sandbox")
            return webdriver.Chrome(chrome_options=options)

        return webdriver.Chrome()
