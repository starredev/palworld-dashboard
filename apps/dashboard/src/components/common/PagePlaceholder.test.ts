import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { Compass } from 'lucide-vue-next'
import PagePlaceholder from './PagePlaceholder.vue'

describe('PagePlaceholder', () => {
  it('renders the provided title and description', () => {
    const wrapper = mount(PagePlaceholder, {
      props: { icon: Compass, title: 'Players', description: 'Coming soon' },
    })

    expect(wrapper.text()).toContain('Players')
    expect(wrapper.text()).toContain('Coming soon')
  })
})
